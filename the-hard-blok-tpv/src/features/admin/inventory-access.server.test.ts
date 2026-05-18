import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	requireBusinessRole: vi.fn(),
	getInventoryItems: vi.fn(),
	getProductStockOverview: vi.fn(),
	getAllStockMovements: vi.fn(),
}));

vi.mock("../auth/tenant-guards.server", () => ({
	requireBusinessRole: mocks.requireBusinessRole,
}));

vi.mock("../inventory/queries.server", () => ({
	getInventoryItems: mocks.getInventoryItems,
	getProductStockOverview: mocks.getProductStockOverview,
	getAllStockMovements: mocks.getAllStockMovements,
}));

vi.mock("./warehouses-access.server", () => ({
	loadWarehousesForAdmin: vi.fn(),
}));

vi.mock("./products-access.server", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("./products-access.server")>();
	return {
		...actual,
		loadProductsForAdmin: vi.fn(),
	};
});

import {
	loadInventoryItemsForAdmin,
	loadInventoryPageForAdmin,
} from "./inventory-access.server";
import { loadProductsForAdmin } from "./products-access.server";
import { loadWarehousesForAdmin } from "./warehouses-access.server";

const sampleRow = {
	id: "ii-1",
	product_id: "p1",
	product_name: "Café",
	category_name: "Bebidas",
	warehouse_id: "principal",
	warehouse_name: "Principal",
	lot_code: "",
	serial_number: "",
	expiry_date: null,
	qty_on_hand: 3,
};

const sampleWarehouse = {
	id: "principal",
	name: "Principal",
	is_active: true,
};

const sampleProduct = {
	id: "p1",
	name: "Café",
	is_active: true,
};

describe("inventory-access.server (tenant-aware read)", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("allows manager to read inventory items", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "manager",
			roleSource: "membership",
		});
		mocks.getInventoryItems.mockResolvedValue([sampleRow]);

		await expect(loadInventoryItemsForAdmin()).resolves.toEqual([sampleRow]);
		expect(mocks.requireBusinessRole).toHaveBeenCalledWith([
			"owner",
			"admin",
			"manager",
		]);
		expect(mocks.getInventoryItems).toHaveBeenCalled();
	});

	it("allows owner to load full inventory page read context", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "owner",
			roleSource: "membership",
		});
		vi.mocked(loadWarehousesForAdmin).mockResolvedValue([sampleWarehouse]);
		vi.mocked(loadProductsForAdmin).mockResolvedValue([sampleProduct]);
		mocks.getInventoryItems.mockResolvedValue([sampleRow]);
		mocks.getProductStockOverview.mockResolvedValue([]);
		mocks.getAllStockMovements.mockResolvedValue([]);

		await expect(loadInventoryPageForAdmin()).resolves.toEqual({
			warehouses: [sampleWarehouse],
			products: [sampleProduct],
			inventoryRows: [sampleRow],
			stockRows: [],
			stockMovements: [],
		});
	});

	it("allows admin via membership", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "admin",
			roleSource: "membership",
		});
		mocks.getInventoryItems.mockResolvedValue([]);

		await expect(loadInventoryItemsForAdmin()).resolves.toEqual([]);
	});

	it("blocks cashier on inventory read", async () => {
		mocks.requireBusinessRole.mockRejectedValue(new Error("FORBIDDEN"));

		await expect(loadInventoryItemsForAdmin()).rejects.toThrow("FORBIDDEN");
		expect(mocks.getInventoryItems).not.toHaveBeenCalled();
	});

	it("uses legacy fallback when roleSource is legacy", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "manager",
			roleSource: "legacy",
			business: null,
		});
		mocks.getInventoryItems.mockResolvedValue([sampleRow]);

		await expect(loadInventoryItemsForAdmin()).resolves.toEqual([sampleRow]);
	});
});
