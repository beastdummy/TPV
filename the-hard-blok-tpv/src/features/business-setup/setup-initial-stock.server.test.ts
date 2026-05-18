import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	connect: vi.fn(),
	getAppUserFn: vi.fn(),
	createPurchaseReceipt: vi.fn(),
}));

vi.mock("../../lib/db.server", () => ({
	db: { connect: mocks.connect },
}));

vi.mock("../auth/auth.rpc", () => ({
	getAppUserFn: mocks.getAppUserFn,
}));

vi.mock("../purchases/queries.server", () => ({
	createPurchaseReceipt: mocks.createPurchaseReceipt,
}));

import { recordSetupInitialStock } from "./setup-initial-stock.server";

function createTxClient() {
	const stock = new Map<string, number>();
	const movements: Array<Record<string, unknown>> = [];

	const client = {
		query: vi.fn(async (sql: string, params?: unknown[]) => {
			const normalized = sql.replace(/\s+/g, " ").trim();

			if (
				normalized === "BEGIN" ||
				normalized === "COMMIT" ||
				normalized === "ROLLBACK"
			) {
				return { rows: [] };
			}

			if (normalized.includes("INSERT INTO product_stock")) {
				const key = `${params?.[0]}:${params?.[1]}`;
				if (!stock.has(key)) {
					stock.set(key, 0);
				}
				return { rows: [] };
			}

			if (
				normalized.includes("FROM product_stock") &&
				normalized.includes("FOR UPDATE")
			) {
				const key = `${params?.[0]}:${params?.[1]}`;
				if (!stock.has(key)) {
					stock.set(key, 0);
				}
				return { rows: [{ quantity: stock.get(key) }] };
			}

			if (normalized.includes("UPDATE product_stock")) {
				const key = `${params?.[0]}:${params?.[1]}`;
				stock.set(key, params?.[2] as number);
				return { rows: [] };
			}

			if (normalized.includes("INSERT INTO stock_movements")) {
				movements.push({
					movement_type: params?.[2],
					reason_code: params?.[8],
					quantity: params?.[3],
				});
				const key = `${params?.[0]}:${params?.[1]}`;
				stock.set(key, params?.[5]);
				return { rows: [] };
			}

			throw new Error(`Unhandled SQL: ${normalized}`);
		}),
		release: vi.fn(),
		getStock: () => stock,
		getMovements: () => movements,
	};

	return client;
}

describe("recordSetupInitialStock", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("creates product_stock without supplier", async () => {
		const client = createTxClient();
		mocks.connect.mockResolvedValue(client);
		mocks.getAppUserFn.mockResolvedValue({ id: "user-1" });

		const result = await recordSetupInitialStock({
			product_id: "p1",
			warehouse_id: "bar",
			quantity: 8,
			unit_cost: 1.5,
			supplier_id: null,
			reason: "initial_stock",
			notes: "Entrada inicial",
		});

		expect(result.receipt_id).toBeNull();
		expect(client.getStock().get("p1:bar")).toBe(8);
		expect(mocks.createPurchaseReceipt).not.toHaveBeenCalled();
	});

	it("uses purchase receipt when supplier is provided", async () => {
		mocks.getAppUserFn.mockResolvedValue({ id: "user-1" });
		mocks.createPurchaseReceipt.mockResolvedValue({ id: "receipt-1" });

		await recordSetupInitialStock({
			product_id: "p1",
			warehouse_id: "bar",
			quantity: 5,
			unit_cost: 2,
			supplier_id: "sup-1",
			reason: "initial_purchase",
			notes: "Compra inicial",
		});

		expect(mocks.createPurchaseReceipt).toHaveBeenCalledWith(
			expect.objectContaining({
				movement_type: "purchase",
				reason_code: "initial_purchase",
			}),
		);
	});
});
