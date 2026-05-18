import { describe, expect, it, vi } from "vitest";

import { adjustStockForAdmin, StockAdjustError } from "./stock-adjust.server";
import {
	StockTransferError,
	transferStockBetweenWarehousesForAdmin,
} from "./stock-transfer.server";

const mocks = vi.hoisted(() => ({
	query: vi.fn(),
	connect: vi.fn(),
	logBusinessAuditEvent: vi.fn(),
}));

vi.mock("../../lib/db.server", () => ({
	db: { connect: mocks.connect },
}));

vi.mock("../business-setup/audit.server", () => ({
	logBusinessAuditEvent: mocks.logBusinessAuditEvent,
}));

function createTxClient() {
	const stock = new Map<string, number>();
	const movements: Array<Record<string, unknown>> = [];

	const client = {
		query: vi.fn(async (sql: string, params?: unknown[]) => {
			const normalized = sql.replace(/\s+/g, " ").trim();
			mocks.query(sql, params);

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
					warehouse_id: params?.[1],
					movement_type: params?.[2],
					correlation_id: params?.[9],
					previous_quantity: params?.[4],
					new_quantity: params?.[5],
				});
				return { rows: [] };
			}

			throw new Error(`Unhandled SQL in test client: ${normalized}`);
		}),
		release: vi.fn(),
		getStock: () => stock,
		getMovements: () => movements,
	};

	return client;
}

describe("inventory hospitality operations", () => {
	it("transfer rejects same origin and destination", async () => {
		await expect(
			transferStockBetweenWarehousesForAdmin({
				business_id: "biz",
				product_id: "p1",
				from_warehouse_id: "a",
				to_warehouse_id: "a",
				quantity: 1,
				reason_code: "reposicion",
				performed_by_user_id: "u1",
			}),
		).rejects.toBeInstanceOf(StockTransferError);
	});

	it("transfer subtracts origin and adds destination with correlation", async () => {
		const client = createTxClient();
		const stock = client.getStock();
		stock.set("p1:from", 5);
		stock.set("p1:to", 2);
		mocks.connect.mockResolvedValue(client);

		const result = await transferStockBetweenWarehousesForAdmin({
			business_id: "biz",
			product_id: "p1",
			from_warehouse_id: "from",
			to_warehouse_id: "to",
			quantity: 4,
			reason_code: "barra",
			performed_by_user_id: "u1",
		});

		expect(stock.get("p1:from")).toBe(1);
		expect(stock.get("p1:to")).toBe(6);
		expect(result.correlation_id).toBeTruthy();
		const movements = client.getMovements();
		expect(movements).toHaveLength(2);
		expect(movements[0]?.correlation_id).toBe(result.correlation_id);
		expect(movements[1]?.correlation_id).toBe(result.correlation_id);
	});

	it("transfer allows negative origin stock", async () => {
		const client = createTxClient();
		const stock = client.getStock();
		stock.set("p1:from", 1);
		stock.set("p1:to", 0);
		mocks.connect.mockResolvedValue(client);

		await transferStockBetweenWarehousesForAdmin({
			business_id: "biz",
			product_id: "p1",
			from_warehouse_id: "from",
			to_warehouse_id: "to",
			quantity: 3,
			reason_code: "urgente",
			performed_by_user_id: "u1",
		});

		expect(stock.get("p1:from")).toBe(-2);
	});

	it("adjust decrease allows negative with reason", async () => {
		const client = createTxClient();
		const stock = client.getStock();
		stock.set("p1:wh", 2);
		mocks.connect.mockResolvedValue(client);

		const result = await adjustStockForAdmin({
			business_id: "biz",
			product_id: "p1",
			warehouse_id: "wh",
			adjustment_type: "decrease",
			quantity: 5,
			reason_code: "waste",
			performed_by_user_id: "u1",
		});

		expect(result.new_quantity).toBe(-3);
		expect(stock.get("p1:wh")).toBe(-3);
	});

	it("adjust other without note fails", async () => {
		const client = createTxClient();
		mocks.connect.mockResolvedValue(client);

		await expect(
			adjustStockForAdmin({
				business_id: "biz",
				product_id: "p1",
				warehouse_id: "wh",
				adjustment_type: "increase",
				quantity: 1,
				reason_code: "other",
				performed_by_user_id: "u1",
			}),
		).rejects.toBeInstanceOf(StockAdjustError);
	});
});
