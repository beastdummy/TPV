import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	requireBusinessRole: vi.fn(),
	getWarehouses: vi.fn(),
	createWarehouse: vi.fn(),
}));

vi.mock("../auth/tenant-guards.server", () => ({
	requireBusinessRole: mocks.requireBusinessRole,
}));

vi.mock("../inventory/queries.server", () => ({
	getWarehouses: mocks.getWarehouses,
	createWarehouse: mocks.createWarehouse,
}));

import {
	createWarehouseForAdmin,
	loadWarehousesForAdmin,
} from "./warehouses-access.server";

const sampleWarehouse = {
	id: "principal",
	name: "Almacén principal",
	is_active: true,
};

describe("warehouses-access.server (tenant-aware)", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("allows owner to list warehouses", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "owner",
			roleSource: "membership",
		});
		mocks.getWarehouses.mockResolvedValue([sampleWarehouse]);

		await expect(loadWarehousesForAdmin()).resolves.toEqual([sampleWarehouse]);
		expect(mocks.requireBusinessRole).toHaveBeenCalledWith([
			"owner",
			"admin",
			"manager",
		]);
	});

	it("allows admin to create warehouse", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "admin",
			roleSource: "membership",
		});
		mocks.createWarehouse.mockResolvedValue(undefined);

		await expect(createWarehouseForAdmin(sampleWarehouse)).resolves.toEqual({
			ok: true,
		});
		expect(mocks.createWarehouse).toHaveBeenCalledWith(sampleWarehouse);
	});

	it("allows manager to list warehouses", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "manager",
			roleSource: "membership",
		});
		mocks.getWarehouses.mockResolvedValue([]);

		await expect(loadWarehousesForAdmin()).resolves.toEqual([]);
	});

	it("blocks cashier on list", async () => {
		mocks.requireBusinessRole.mockRejectedValue(new Error("FORBIDDEN"));

		await expect(loadWarehousesForAdmin()).rejects.toThrow("FORBIDDEN");
		expect(mocks.getWarehouses).not.toHaveBeenCalled();
	});

	it("blocks cashier on create", async () => {
		mocks.requireBusinessRole.mockRejectedValue(new Error("FORBIDDEN"));

		await expect(createWarehouseForAdmin(sampleWarehouse)).rejects.toThrow(
			"FORBIDDEN",
		);
		expect(mocks.createWarehouse).not.toHaveBeenCalled();
	});

	it("uses legacy fallback when roleSource is legacy", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "manager",
			roleSource: "legacy",
			business: null,
		});
		mocks.getWarehouses.mockResolvedValue([sampleWarehouse]);

		await expect(loadWarehousesForAdmin()).resolves.toEqual([sampleWarehouse]);
	});
});
