import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	createWarehouseForAdmin: vi.fn(),
	setDefaultWarehouse: vi.fn(),
	setBusinessOperationalWarehouseId: vi.fn(),
	countActiveWarehouses: vi.fn(),
	getWarehouses: vi.fn(),
	createProductForAdmin: vi.fn(),
	createCategoryForAdmin: vi.fn(),
	resolveOperationalWarehouseIdForBusiness: vi.fn(),
	auditWarehouseCreated: vi.fn(),
	auditProductCreated: vi.fn(),
	auditInitialStockRecorded: vi.fn(),
}));

vi.mock("../admin/warehouses-access.server", () => ({
	createWarehouseForAdmin: mocks.createWarehouseForAdmin,
}));

vi.mock("../inventory/operational-warehouse.server", () => ({
	setDefaultWarehouse: mocks.setDefaultWarehouse,
	setBusinessOperationalWarehouseId: mocks.setBusinessOperationalWarehouseId,
	resolveOperationalWarehouseIdForBusiness:
		mocks.resolveOperationalWarehouseIdForBusiness,
}));

vi.mock("./setup-queries.server", () => ({
	countActiveWarehouses: mocks.countActiveWarehouses,
}));

vi.mock("../inventory/queries.server", () => ({
	getWarehouses: mocks.getWarehouses,
}));

vi.mock("../admin/products-access.server", () => ({
	createProductForAdmin: mocks.createProductForAdmin,
}));

vi.mock("../admin/categories-access.server", () => ({
	createCategoryForAdmin: mocks.createCategoryForAdmin,
}));

vi.mock("./setup-initial-stock.server", () => ({
	recordSetupInitialStock: vi.fn().mockResolvedValue({
		receipt_id: "receipt-1",
		movement_type: "purchase",
	}),
}));

vi.mock("./setup-audit-hooks.server", () => ({
	auditWarehouseCreated: mocks.auditWarehouseCreated,
	auditCategoryCreated: vi.fn(),
	auditProductCreated: mocks.auditProductCreated,
	auditInitialStockRecorded: mocks.auditInitialStockRecorded,
	auditInitialStockCreated: vi.fn(),
	auditInitialPurchaseCreated: vi.fn(),
	auditCashSessionOpened: vi.fn(),
}));

import {
	setupCreateCategory,
	setupCreateInitialStock,
	setupCreateProduct,
	setupCreateWarehouse,
} from "./setup-wizard-actions.server";

describe("setup wizard warehouse consistency", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.countActiveWarehouses.mockResolvedValue(0);
		mocks.createWarehouseForAdmin.mockResolvedValue({ ok: true });
		mocks.setDefaultWarehouse.mockResolvedValue(undefined);
		mocks.setBusinessOperationalWarehouseId.mockResolvedValue(undefined);
		mocks.resolveOperationalWarehouseIdForBusiness.mockResolvedValue("barra");
		mocks.createProductForAdmin.mockResolvedValue({
			ok: true,
			productId: "prod-1",
		});
	});

	it("does not change operational warehouse when creating a second one", async () => {
		mocks.countActiveWarehouses.mockResolvedValueOnce(1);
		mocks.getWarehouses.mockResolvedValueOnce([
			{ id: "barra", name: "Barra", is_active: true, is_default: true },
		]);

		await setupCreateWarehouse(
			{ id: "cocina", name: "Cocina", is_active: true },
			"biz-1",
		);

		expect(mocks.createWarehouseForAdmin).toHaveBeenCalledWith(
			expect.objectContaining({ is_default: false }),
		);
		expect(mocks.setDefaultWarehouse).not.toHaveBeenCalled();
		expect(mocks.setBusinessOperationalWarehouseId).not.toHaveBeenCalled();
	});

	it("creates a single warehouse and marks it operational", async () => {
		const result = await setupCreateWarehouse(
			{ id: "barra", name: "Barra", is_active: true },
			"biz-1",
		);

		expect(mocks.createWarehouseForAdmin).toHaveBeenCalledTimes(1);
		expect(mocks.setDefaultWarehouse).toHaveBeenCalledWith("barra");
		expect(mocks.setBusinessOperationalWarehouseId).toHaveBeenCalledWith(
			"biz-1",
			"barra",
		);
		expect(result.warehouseId).toBe("barra");
	});

	it("assigns product and stock to the operational warehouse", async () => {
		await setupCreateProduct(
			{
				name: "Café",
				description: "",
				price: 2,
				category_id: "bebidas",
				image_url: "",
				tax_rate: 10,
				warehouse: "ignored",
				sort_order: 0,
			},
			"biz-1",
		);

		expect(mocks.createProductForAdmin).toHaveBeenCalledWith(
			expect.objectContaining({ warehouse: "barra" }),
		);

		const { recordSetupInitialStock } = await import(
			"./setup-initial-stock.server"
		);

		await setupCreateInitialStock(
			{
				product_id: "prod-1",
				quantity: 5,
				unit_cost: 1,
				supplier_id: "sup-1",
			},
			"biz-1",
		);

		expect(recordSetupInitialStock).toHaveBeenCalledWith(
			expect.objectContaining({
				warehouse_id: "barra",
				product_id: "prod-1",
			}),
		);
	});

	it("allows creating several categories during setup", async () => {
		mocks.createCategoryForAdmin.mockResolvedValue({ ok: true });

		await setupCreateCategory({
			id: "bebidas",
			name: "Bebidas",
			description: "",
			sort_order: 0,
			is_active: true,
		});
		await setupCreateCategory({
			id: "comida",
			name: "Comida",
			description: "",
			sort_order: 1,
			is_active: true,
		});

		expect(mocks.createCategoryForAdmin).toHaveBeenCalledTimes(2);
	});

	it("allows creating several products during setup", async () => {
		mocks.createProductForAdmin
			.mockResolvedValueOnce({ ok: true, productId: "prod-1" })
			.mockResolvedValueOnce({ ok: true, productId: "prod-2" });

		const base = {
			description: "",
			price: 2,
			category_id: "bebidas",
			image_url: "",
			tax_rate: 10,
			warehouse: "ignored",
			sort_order: 0,
		};

		await setupCreateProduct({ ...base, name: "Cola" }, "biz-1");
		await setupCreateProduct({ ...base, name: "Agua" }, "biz-1");

		expect(mocks.createProductForAdmin).toHaveBeenCalledTimes(2);
	});

	it("allows registering several initial stock entries during setup", async () => {
		const { recordSetupInitialStock } = await import(
			"./setup-initial-stock.server"
		);

		await setupCreateInitialStock(
			{ product_id: "prod-1", quantity: 5, unit_cost: 1 },
			"biz-1",
		);
		await setupCreateInitialStock(
			{ product_id: "prod-2", quantity: 12, unit_cost: 0.5 },
			"biz-1",
		);

		expect(recordSetupInitialStock).toHaveBeenCalledTimes(2);
	});

	it("createProduct does not record stock", async () => {
		const { recordSetupInitialStock } = await import(
			"./setup-initial-stock.server"
		);

		await setupCreateProduct(
			{
				name: "Café",
				description: "",
				price: 2,
				category_id: "bebidas",
				image_url: "",
				tax_rate: 10,
				warehouse: "ignored",
				sort_order: 0,
			},
			"biz-1",
		);

		expect(recordSetupInitialStock).not.toHaveBeenCalled();
	});
});
