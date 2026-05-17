import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	connect: vi.fn(),
}));

vi.mock("../../../lib/db.server", () => ({
	db: { connect: mocks.connect },
}));

import { SALES_TX_ERROR_CODES, SalesTransactionError } from "./errors";
import { executeFinalizeSaleCommand } from "./finalize-sale-command.server";

const businessId = "biz-1";
const userId = "user-1";
const sessionId = "sess-1";
const productId = "00000000-0000-4000-8000-000000000002";

const baseCommandInput = {
	business_id: businessId,
	user_id: userId,
	idempotency_key: "sale:v1:biz-1:finalize_sale:req-cmd",
	cash_session_id: sessionId,
	terminal_id: "tpv-1",
	payment_method: "cash" as const,
	notes: "",
	lines: [
		{
			product_id: productId,
			product_name: "Té",
			quantity: 1,
			unit_price: 4,
			discount_percent: 0,
			tax_rate: 0,
			line_discount: 0,
			line_tax: 0,
			line_total: 4,
		},
	],
};

function createMockClient() {
	const calls: string[] = [];
	let receiptCounter = 41;

	const client = {
		query: vi.fn(async (sql: string, params?: unknown[]) => {
			const normalized = sql.replace(/\s+/g, " ").trim();
			calls.push(normalized);

			if (
				normalized === "BEGIN" ||
				normalized === "COMMIT" ||
				normalized === "ROLLBACK"
			) {
				return { rows: [] };
			}

			if (
				normalized.includes("FROM cash_sessions") &&
				normalized.includes("FOR UPDATE")
			) {
				return { rows: [{ status: "open" }] };
			}

			if (normalized.includes("INSERT INTO sale_idempotency_keys")) {
				return { rows: [] };
			}

			if (
				normalized.includes("FROM sale_idempotency_keys") &&
				normalized.includes("FOR UPDATE")
			) {
				return {
					rows: [
						{
							id: "idem-1",
							sale_id: null,
							response_payload: null,
							completed_at: null,
						},
					],
				};
			}

			if (normalized.includes("pg_advisory_xact_lock")) {
				return { rows: [] };
			}

			if (normalized.includes("MAX(receipt_number)")) {
				receiptCounter += 1;
				return { rows: [{ next_receipt: receiptCounter }] };
			}

			if (normalized.includes("INSERT INTO sales")) {
				return {
					rows: [{ id: "sale-new", receipt_number: receiptCounter, total: 4 }],
				};
			}

			if (normalized.includes("INSERT INTO sale_items")) {
				if (params?.[2] === "FAIL_ITEM") {
					throw new Error("sale_items insert failed");
				}
				return { rows: [] };
			}

			if (
				normalized.includes("UPDATE sales") &&
				normalized.includes("completed")
			) {
				return { rows: [] };
			}

			if (normalized.includes("UPDATE sale_idempotency_keys")) {
				return { rows: [] };
			}

			throw new Error(`Unhandled SQL in mock: ${normalized}`);
		}),
		release: vi.fn(),
		getCalls: () => calls,
	};

	return client;
}

describe("finalize-sale-command.server", () => {
	afterEach(() => {
		vi.resetAllMocks();
	});

	it("commits a sale in a single transaction", async () => {
		const client = createMockClient();
		mocks.connect.mockResolvedValue(client);

		const result = await executeFinalizeSaleCommand(baseCommandInput);

		expect(result).toMatchObject({
			sale_id: "sale-new",
			status: "completed",
			total: 4,
			idempotency_key: baseCommandInput.idempotency_key,
		});
		expect(client.getCalls()).toContain("BEGIN");
		expect(client.getCalls()).toContain("COMMIT");
		expect(client.query).not.toHaveBeenCalledWith("ROLLBACK");
	});

	it("returns cached result for completed idempotency key", async () => {
		const client = createMockClient();
		const cached = {
			sale_id: "sale-cached",
			receipt_number: 7,
			status: "completed" as const,
			total: 9,
			idempotency_key: baseCommandInput.idempotency_key,
		};

		client.query.mockImplementation(async (sql: string) => {
			const normalized = sql.replace(/\s+/g, " ").trim();
			if (
				normalized === "BEGIN" ||
				normalized === "COMMIT" ||
				normalized === "ROLLBACK"
			) {
				return { rows: [] };
			}
			if (normalized.includes("FROM cash_sessions")) {
				return { rows: [{ status: "open" }] };
			}
			if (normalized.includes("INSERT INTO sale_idempotency_keys")) {
				return { rows: [] };
			}
			if (normalized.includes("FROM sale_idempotency_keys")) {
				return {
					rows: [
						{
							id: "idem-1",
							sale_id: "sale-cached",
							response_payload: cached,
							completed_at: "2026-01-01T12:00:00Z",
						},
					],
				};
			}
			throw new Error(`Unexpected: ${normalized}`);
		});

		mocks.connect.mockResolvedValue(client);

		await expect(executeFinalizeSaleCommand(baseCommandInput)).resolves.toEqual(
			cached,
		);
		expect(
			client.getCalls().some((sql) => sql.includes("INSERT INTO sales")),
		).toBe(false);
	});

	it("rolls back when a sale line insert fails", async () => {
		const client = createMockClient();
		mocks.connect.mockResolvedValue(client);

		await expect(
			executeFinalizeSaleCommand({
				...baseCommandInput,
				lines: [
					{
						...baseCommandInput.lines[0],
						product_name: "FAIL_ITEM",
					},
				],
			}),
		).rejects.toThrow("sale_items insert failed");

		expect(client.getCalls()).toContain("ROLLBACK");
		expect(client.getCalls()).not.toContain("COMMIT");
	});

	it("uses advisory lock before allocating receipt_number", async () => {
		const client = createMockClient();
		mocks.connect.mockResolvedValue(client);

		await executeFinalizeSaleCommand(baseCommandInput);

		const calls = client.getCalls();
		const lockIndex = calls.findIndex((sql) =>
			sql.includes("pg_advisory_xact_lock"),
		);
		const receiptIndex = calls.findIndex((sql) =>
			sql.includes("MAX(receipt_number)"),
		);
		expect(lockIndex).toBeGreaterThanOrEqual(0);
		expect(receiptIndex).toBeGreaterThan(lockIndex);
	});

	it("rejects closed cash session inside transaction", async () => {
		const client = createMockClient();
		client.query.mockImplementation(async (sql: string) => {
			const normalized = sql.replace(/\s+/g, " ").trim();
			client.getCalls().push(normalized);
			if (normalized === "BEGIN" || normalized === "ROLLBACK") {
				return { rows: [] };
			}
			if (normalized.includes("FROM cash_sessions")) {
				return { rows: [{ status: "closed" }] };
			}
			throw new Error(`Unexpected: ${normalized}`);
		});
		mocks.connect.mockResolvedValue(client);

		await expect(
			executeFinalizeSaleCommand(baseCommandInput),
		).rejects.toMatchObject({
			code: SALES_TX_ERROR_CODES.CASH_SESSION_NOT_OPEN,
		});
		expect(client.getCalls()).toContain("ROLLBACK");
	});

	it("throws idempotency conflict when sale is in progress", async () => {
		const client = createMockClient();
		client.query.mockImplementation(async (sql: string) => {
			const normalized = sql.replace(/\s+/g, " ").trim();
			if (normalized === "BEGIN" || normalized === "ROLLBACK") {
				return { rows: [] };
			}
			if (normalized.includes("FROM cash_sessions")) {
				return { rows: [{ status: "open" }] };
			}
			if (normalized.includes("INSERT INTO sale_idempotency_keys")) {
				return { rows: [] };
			}
			if (normalized.includes("FROM sale_idempotency_keys")) {
				return {
					rows: [
						{
							id: "idem-1",
							sale_id: "sale-partial",
							response_payload: null,
							completed_at: null,
						},
					],
				};
			}
			throw new Error(`Unexpected: ${normalized}`);
		});
		mocks.connect.mockResolvedValue(client);

		await expect(
			executeFinalizeSaleCommand(baseCommandInput),
		).rejects.toBeInstanceOf(SalesTransactionError);
		await expect(
			executeFinalizeSaleCommand(baseCommandInput),
		).rejects.toMatchObject({
			code: SALES_TX_ERROR_CODES.IDEMPOTENCY_CONFLICT,
		});
	});
});
