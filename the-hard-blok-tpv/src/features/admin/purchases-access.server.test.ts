import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	requireBusinessRole: vi.fn(),
	getSuppliers: vi.fn(),
	getRecentPurchaseReceipts: vi.fn(),
}));

vi.mock("../auth/tenant-guards.server", () => ({
	requireBusinessRole: mocks.requireBusinessRole,
}));

vi.mock("../purchases/queries.server", () => ({
	getSuppliers: mocks.getSuppliers,
	getRecentPurchaseReceipts: mocks.getRecentPurchaseReceipts,
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

import { loadProductsForAdmin } from "./products-access.server";
import {
	loadPurchasesPageForAdmin,
	loadRecentPurchaseReceiptsForAdmin,
	loadSuppliersForAdmin,
} from "./purchases-access.server";
import { loadWarehousesForAdmin } from "./warehouses-access.server";

const sampleSupplier = {
	id: "s1",
	name: "Proveedor SA",
	tax_id: "B123",
	email: "a@test.com",
	phone: "600",
	is_active: true,
};

const sampleReceipt = {
	id: "r1",
	supplier_name: "Proveedor SA",
	warehouse_name: "Principal",
	total_amount: 50,
	created_at: "2026-01-01T00:00:00Z",
	created_by_user_name: "Owner",
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

describe("purchases-access.server (tenant-aware read)", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("allows manager to list suppliers", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "manager",
			roleSource: "membership",
		});
		mocks.getSuppliers.mockResolvedValue([sampleSupplier]);

		await expect(loadSuppliersForAdmin()).resolves.toEqual([sampleSupplier]);
		expect(mocks.requireBusinessRole).toHaveBeenCalledWith([
			"owner",
			"admin",
			"manager",
		]);
		expect(mocks.getSuppliers).toHaveBeenCalled();
	});

	it("allows owner to load full purchases page read context", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "owner",
			roleSource: "membership",
		});
		mocks.getSuppliers.mockResolvedValue([sampleSupplier]);
		mocks.getRecentPurchaseReceipts.mockResolvedValue([sampleReceipt]);
		vi.mocked(loadWarehousesForAdmin).mockResolvedValue([sampleWarehouse]);
		vi.mocked(loadProductsForAdmin).mockResolvedValue([sampleProduct]);

		await expect(loadPurchasesPageForAdmin()).resolves.toEqual({
			suppliers: [sampleSupplier],
			warehouses: [sampleWarehouse],
			products: [sampleProduct],
			receipts: [sampleReceipt],
		});
	});

	it("allows admin to read recent receipts", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "admin",
			roleSource: "membership",
		});
		mocks.getRecentPurchaseReceipts.mockResolvedValue([]);

		await expect(loadRecentPurchaseReceiptsForAdmin()).resolves.toEqual([]);
	});

	it("blocks cashier on suppliers read", async () => {
		mocks.requireBusinessRole.mockRejectedValue(new Error("FORBIDDEN"));

		await expect(loadSuppliersForAdmin()).rejects.toThrow("FORBIDDEN");
		expect(mocks.getSuppliers).not.toHaveBeenCalled();
	});

	it("uses legacy fallback when roleSource is legacy", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "manager",
			roleSource: "legacy",
			business: null,
		});
		mocks.getSuppliers.mockResolvedValue([sampleSupplier]);

		await expect(loadSuppliersForAdmin()).resolves.toEqual([sampleSupplier]);
	});
});
