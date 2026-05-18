import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	createWarehouseForAdmin: vi.fn(),
	setDefaultWarehouse: vi.fn(),
	setBusinessOperationalWarehouseId: vi.fn(),
	countActiveWarehouses: vi.fn(),
	getWarehouses: vi.fn(),
	getWarehouseById: vi.fn(),
	auditWarehouseCreated: vi.fn(),
}));

vi.mock("../admin/warehouses-access.server", () => ({
	createWarehouseForAdmin: mocks.createWarehouseForAdmin,
}));

vi.mock("../inventory/operational-warehouse.server", () => ({
	setDefaultWarehouse: mocks.setDefaultWarehouse,
	setBusinessOperationalWarehouseId: mocks.setBusinessOperationalWarehouseId,
	getWarehouseById: mocks.getWarehouseById,
}));

vi.mock("./setup-queries.server", () => ({
	countActiveWarehouses: mocks.countActiveWarehouses,
}));

vi.mock("../inventory/queries.server", () => ({
	getWarehouses: mocks.getWarehouses,
}));

vi.mock("./setup-audit-hooks.server", () => ({
	auditWarehouseCreated: mocks.auditWarehouseCreated,
}));

import {
	setupCreateWarehouse,
	setupSetOperationalWarehouse,
} from "./setup-wizard-actions.server";

describe("setup warehouses wizard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.createWarehouseForAdmin.mockResolvedValue({ ok: true });
		mocks.setDefaultWarehouse.mockResolvedValue(undefined);
		mocks.setBusinessOperationalWarehouseId.mockResolvedValue(undefined);
		mocks.getWarehouseById.mockResolvedValue({
			id: "cocina",
			name: "Cocina",
			is_active: true,
			is_default: false,
		});
	});

	it("marks operational warehouse explicitly", async () => {
		const result = await setupSetOperationalWarehouse("biz-1", "cocina");

		expect(mocks.setDefaultWarehouse).toHaveBeenCalledWith("cocina");
		expect(mocks.setBusinessOperationalWarehouseId).toHaveBeenCalledWith(
			"biz-1",
			"cocina",
		);
		expect(result.warehouseName).toBe("Cocina");
	});

	it("creates several warehouses from setup", async () => {
		mocks.countActiveWarehouses
			.mockResolvedValueOnce(0)
			.mockResolvedValueOnce(1);
		mocks.getWarehouses.mockResolvedValueOnce([
			{ id: "barra", name: "Barra", is_active: true, is_default: true },
		]);

		await setupCreateWarehouse(
			{ id: "barra", name: "Barra", is_active: true },
			"biz-1",
		);
		await setupCreateWarehouse(
			{ id: "cocina", name: "Cocina", is_active: true },
			"biz-1",
		);

		expect(mocks.createWarehouseForAdmin).toHaveBeenCalledTimes(2);
	});
});
