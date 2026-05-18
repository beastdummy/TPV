import { afterEach, describe, expect, it, vi } from "vitest";

import {
	aggregateSaleLinesByProduct,
	decrementStockForSale,
	SALE_STOCK_MOVEMENT_TYPE,
} from "./finalize-sale-stock.server";

const warehouseId = "principal";
const userId = "user-1";
const saleId = "sale-1";
const productA = "00000000-0000-4000-8000-000000000001";
const productB = "00000000-0000-4000-8000-000000000002";

type StockMovementRecord = {
	product_id: string;
	warehouse_id: string;
	movement_type: string;
	quantity: number;
	previous_quantity: number;
	new_quantity: number;
	reason: string;
	performed_by_user_id: string;
};

function createStockClient(initialStock: Record<string, number>) {
	const stock = new Map<string, number>(
		Object.entries(initialStock).map(([productId, qty]) => [
			`${productId}:${warehouseId}`,
			qty,
		]),
	);
	const movements: StockMovementRecord[] = [];

	const client = {
		query: vi.fn(async (sql: string, params?: unknown[]) => {
			const normalized = sql.replace(/\s+/g, " ").trim();

			if (normalized.includes("INSERT INTO product_stock")) {
				const productId = params?.[0] as string;
				const key = `${productId}:${params?.[1]}`;
				if (!stock.has(key)) {
					stock.set(key, 0);
				}
				return { rows: [] };
			}

			if (
				normalized.includes("FROM product_stock") &&
				normalized.includes("FOR UPDATE")
			) {
				const productId = params?.[0] as string;
				const key = `${productId}:${params?.[1]}`;
				if (!stock.has(key)) {
					stock.set(key, 0);
				}
				return { rows: [{ quantity: stock.get(key) }] };
			}

			if (normalized.includes("UPDATE product_stock")) {
				const productId = params?.[0] as string;
				const key = `${productId}:${params?.[1]}`;
				stock.set(key, params?.[2] as number);
				return { rows: [] };
			}

			if (normalized.includes("INSERT INTO stock_movements")) {
				movements.push({
					product_id: params?.[0] as string,
					warehouse_id: params?.[1] as string,
					movement_type: params?.[2] as string,
					quantity: params?.[3] as number,
					previous_quantity: params?.[4] as number,
					new_quantity: params?.[5] as number,
					reason: params?.[6] as string,
					performed_by_user_id: params?.[10] as string,
				});
				return { rows: [] };
			}

			throw new Error(`Unhandled SQL: ${normalized}`);
		}),
		getStock: (productId: string) => stock.get(`${productId}:${warehouseId}`),
		getMovements: () => movements,
	};

	return client;
}

describe("finalize-sale-stock.server", () => {
	afterEach(() => {
		vi.resetAllMocks();
	});

	it("aggregates multiple lines for the same product", () => {
		expect(
			aggregateSaleLinesByProduct([
				{ product_id: productB, quantity: 2 },
				{ product_id: productA, quantity: 1 },
				{ product_id: productB, quantity: 3 },
			]),
		).toEqual([
			{ product_id: productA, quantity: 1 },
			{ product_id: productB, quantity: 5 },
		]);
	});

	it("decrements stock and creates sale movement", async () => {
		const client = createStockClient({ [productA]: 10 });

		const negative = await decrementStockForSale(client, {
			warehouse_id: warehouseId,
			user_id: userId,
			sale_id: saleId,
			lines: [
				{ product_id: productA, product_name: "Producto A", quantity: 3 },
			],
		});

		expect(client.getStock(productA)).toBe(7);
		expect(negative).toEqual([]);
		expect(client.getMovements()[0]?.movement_type).toBe(
			SALE_STOCK_MOVEMENT_TYPE,
		);
	});

	it("allows sale with zero stock and returns negative_stock_items", async () => {
		const client = createStockClient({ [productA]: 0 });

		const negative = await decrementStockForSale(client, {
			warehouse_id: warehouseId,
			user_id: userId,
			sale_id: saleId,
			lines: [
				{ product_id: productA, product_name: "Producto A", quantity: 12 },
			],
		});

		expect(client.getStock(productA)).toBe(-12);
		expect(negative).toEqual([
			expect.objectContaining({
				product_id: productA,
				before_quantity: 0,
				sold_quantity: 12,
				after_quantity: -12,
			}),
		]);
	});

	it("allows partial stock and leaves negative balance", async () => {
		const client = createStockClient({ [productA]: 3 });

		const negative = await decrementStockForSale(client, {
			warehouse_id: warehouseId,
			user_id: userId,
			sale_id: saleId,
			lines: [
				{ product_id: productA, product_name: "Producto A", quantity: 5 },
			],
		});

		expect(client.getStock(productA)).toBe(-2);
		expect(negative).toHaveLength(1);
		expect(client.getMovements()).toHaveLength(1);
	});

	it("creates stock row when missing and allows negative", async () => {
		const client = createStockClient({});

		const negative = await decrementStockForSale(client, {
			warehouse_id: warehouseId,
			user_id: userId,
			sale_id: saleId,
			lines: [
				{ product_id: productA, product_name: "Producto A", quantity: 2 },
			],
		});

		expect(client.getStock(productA)).toBe(-2);
		expect(negative).toHaveLength(1);
	});
});
