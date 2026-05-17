import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	connect: vi.fn(),
}));

vi.mock("../../../lib/db.server", () => ({
	db: { connect: mocks.connect },
}));

import { SALES_TX_ERROR_CODES, SalesTransactionError } from "./errors";
import { executeFinalizeSaleCommand } from "./finalize-sale-command.server";
import { SALE_STOCK_MOVEMENT_TYPE } from "./finalize-sale-stock.server";

const businessId = "biz-1";
const userId = "user-1";
const sessionId = "sess-1";
const warehouseId = "principal";
const productId = "00000000-0000-4000-8000-000000000002";

function buildPaymentSnapshot(overrides: { amount?: number } = {}) {
	return {
		payment_id: "pay-new",
		payment_method: "cash" as const,
		amount: overrides.amount ?? 4,
		currency: "EUR",
		status: "completed" as const,
		provider: "internal" as const,
	};
}

const baseCommandInput = {
	business_id: businessId,
	user_id: userId,
	idempotency_key: "sale:v1:biz-1:finalize_sale:req-cmd",
	cash_session_id: sessionId,
	terminal_id: "tpv-1",
	warehouse_id: warehouseId,
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

type StockMovementRecord = {
	product_id: string;
	movement_type: string;
	quantity: number;
};

function createMockClient(options?: { initialStock?: Record<string, number> }) {
	const calls: string[] = [];
	let receiptCounter = 41;
	const initialStock = options?.initialStock ?? { [productId]: 100 };
	const stock = new Map<string, number>(
		Object.entries(initialStock).map(([id, qty]) => [
			`${id}:${warehouseId}`,
			qty,
		]),
	);
	const stockMovements: StockMovementRecord[] = [];

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
				normalized.includes("FROM product_stock") &&
				normalized.includes("FOR UPDATE")
			) {
				const pid = params?.[0] as string;
				const key = `${pid}:${params?.[1]}`;
				if (!stock.has(key)) {
					return { rows: [] };
				}
				return { rows: [{ quantity: stock.get(key) }] };
			}

			if (normalized.includes("UPDATE product_stock")) {
				const pid = params?.[0] as string;
				const key = `${pid}:${params?.[1]}`;
				stock.set(key, params?.[2] as number);
				return { rows: [] };
			}

			if (normalized.includes("INSERT INTO stock_movements")) {
				stockMovements.push({
					product_id: params?.[0] as string,
					movement_type: params?.[2] as string,
					quantity: params?.[3] as number,
				});
				return { rows: [] };
			}

			if (normalized.includes("INSERT INTO sale_payments")) {
				return {
					rows: [
						{
							id: "pay-new",
							sale_id: params?.[0],
							business_id: params?.[1],
							payment_method: params?.[2],
							amount: params?.[3],
							currency: params?.[4],
							status: params?.[5],
							provider: params?.[6],
							provider_reference: params?.[7],
							created_at: "2026-01-01T10:00:00Z",
							processed_at: params?.[8],
						},
					],
				};
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
		getStock: (pid: string) => stock.get(`${pid}:${warehouseId}`),
		getStockMovements: () => stockMovements,
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
			payment: buildPaymentSnapshot(),
		});
		expect(client.getCalls()).toContain("BEGIN");
		expect(client.getCalls()).toContain("COMMIT");
		expect(client.query).not.toHaveBeenCalledWith("ROLLBACK");
	});

	it("decrements stock before completing the sale", async () => {
		const client = createMockClient({ initialStock: { [productId]: 10 } });
		mocks.connect.mockResolvedValue(client);

		await executeFinalizeSaleCommand({
			...baseCommandInput,
			lines: [
				{
					...baseCommandInput.lines[0],
					quantity: 4,
				},
			],
		});

		expect(client.getStock(productId)).toBe(6);
		expect(client.getStockMovements()).toEqual([
			{
				product_id: productId,
				movement_type: SALE_STOCK_MOVEMENT_TYPE,
				quantity: 4,
			},
		]);

		const itemIndex = client
			.getCalls()
			.findIndex((sql) => sql.includes("INSERT INTO sale_items"));
		const stockIndex = client
			.getCalls()
			.findIndex((sql) => sql.includes("FROM product_stock"));
		const paymentIndex = client
			.getCalls()
			.findIndex((sql) => sql.includes("INSERT INTO sale_payments"));
		const completeIndex = client
			.getCalls()
			.findIndex(
				(sql) => sql.includes("UPDATE sales") && sql.includes("completed"),
			);
		expect(itemIndex).toBeGreaterThanOrEqual(0);
		expect(stockIndex).toBeGreaterThan(itemIndex);
		expect(paymentIndex).toBeGreaterThan(stockIndex);
		expect(completeIndex).toBeGreaterThan(paymentIndex);
	});

	it("persists internal cash payment snapshot before completing sale", async () => {
		const client = createMockClient();
		mocks.connect.mockResolvedValue(client);

		const result = await executeFinalizeSaleCommand(baseCommandInput);

		expect(result.payment).toMatchObject({
			payment_method: "cash",
			status: "completed",
			provider: "internal",
			amount: 4,
			currency: "EUR",
		});
		expect(
			client
				.getCalls()
				.filter((sql) => sql.includes("INSERT INTO sale_payments")),
		).toHaveLength(1);
	});

	it("returns cached result for completed idempotency key without stock writes", async () => {
		const client = createMockClient();
		const cached = {
			sale_id: "sale-cached",
			receipt_number: 7,
			status: "completed" as const,
			total: 9,
			idempotency_key: baseCommandInput.idempotency_key,
			payment: {
				...buildPaymentSnapshot({ amount: 9 }),
				payment_id: "pay-cached",
			},
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
		expect(
			client.getCalls().some((sql) => sql.includes("FROM product_stock")),
		).toBe(false);
		expect(
			client
				.getCalls()
				.some((sql) => sql.includes("INSERT INTO sale_payments")),
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
		expect(client.getStockMovements()).toHaveLength(0);
	});

	it("rolls back entire sale when stock is insufficient", async () => {
		const client = createMockClient({ initialStock: { [productId]: 1 } });
		mocks.connect.mockResolvedValue(client);

		await expect(
			executeFinalizeSaleCommand({
				...baseCommandInput,
				lines: [{ ...baseCommandInput.lines[0], quantity: 2 }],
			}),
		).rejects.toMatchObject({
			code: SALES_TX_ERROR_CODES.INSUFFICIENT_STOCK,
		});

		expect(client.getCalls()).toContain("ROLLBACK");
		expect(client.getCalls()).not.toContain("COMMIT");
		expect(client.getStock(productId)).toBe(1);
		expect(client.getStockMovements()).toHaveLength(0);
	});

	it("rolls back entire sale when stock row is missing", async () => {
		const client = createMockClient({ initialStock: {} });
		mocks.connect.mockResolvedValue(client);

		await expect(
			executeFinalizeSaleCommand(baseCommandInput),
		).rejects.toMatchObject({
			code: SALES_TX_ERROR_CODES.STOCK_NOT_FOUND,
		});

		expect(client.getCalls()).toContain("ROLLBACK");
		expect(client.getStockMovements()).toHaveLength(0);
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

	it("does not decrement stock twice on idempotent replay", async () => {
		const client = createMockClient({ initialStock: { [productId]: 10 } });
		mocks.connect.mockResolvedValue(client);

		await executeFinalizeSaleCommand(baseCommandInput);
		expect(client.getStock(productId)).toBe(9);
		expect(client.getStockMovements()).toHaveLength(1);

		const cached = {
			sale_id: "sale-cached",
			receipt_number: 7,
			status: "completed" as const,
			total: 4,
			idempotency_key: baseCommandInput.idempotency_key,
			payment: buildPaymentSnapshot(),
		};

		client.query.mockImplementation(async (sql: string) => {
			const normalized = sql.replace(/\s+/g, " ").trim();
			client.getCalls().push(normalized);

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
							sale_id: cached.sale_id,
							response_payload: cached,
							completed_at: "2026-01-01T12:00:00Z",
						},
					],
				};
			}
			throw new Error(`Unexpected on replay: ${normalized}`);
		});

		await expect(executeFinalizeSaleCommand(baseCommandInput)).resolves.toEqual(
			cached,
		);
		expect(client.getStock(productId)).toBe(9);
		expect(client.getStockMovements()).toHaveLength(1);
	});
});
