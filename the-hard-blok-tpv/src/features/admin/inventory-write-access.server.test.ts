import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	requireBusinessRole: vi.fn(),
	getAppUserFn: vi.fn(),
	setProductStock: vi.fn(),
	createStockMovement: vi.fn(),
	createInventoryMovementDetailed: vi.fn(),
}));

vi.mock("../auth/tenant-guards.server", () => ({
	requireBusinessRole: mocks.requireBusinessRole,
}));

vi.mock("../auth/auth.rpc", () => ({
	getAppUserFn: mocks.getAppUserFn,
}));

vi.mock("../inventory/queries.server", () => ({
	setProductStock: mocks.setProductStock,
	createStockMovement: mocks.createStockMovement,
	createInventoryMovementDetailed: mocks.createInventoryMovementDetailed,
}));

import {
	createInventoryMovementDetailedForAdmin,
	createStockMovementForAdmin,
	setProductStockForAdmin,
} from "./inventory-write-access.server";

const sessionUser = {
	id: "user-1",
	email: "owner@test.com",
	name: "Owner",
	role: "owner" as const,
};

const detailedMovement = {
	product_id: "p1",
	warehouse_id: "principal",
	movement_type: "in" as const,
	quantity: 2,
	lot_code: "L-1",
	serial_number: "",
	expiry_date: null,
	reason: "Recepción",
};

const simpleMovement = {
	product_id: "p1",
	warehouse_id: "principal",
	movement_type: "out" as const,
	quantity: 1,
	reason: "Merma",
};

const setStockInput = {
	product_id: "p1",
	warehouse_id: "principal",
	quantity: 10,
};

describe("inventory-write-access.server (tenant-aware write)", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("allows manager to register detailed inventory movement", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "manager",
			roleSource: "membership",
		});
		mocks.getAppUserFn.mockResolvedValue(sessionUser);
		mocks.createInventoryMovementDetailed.mockResolvedValue(undefined);

		await expect(
			createInventoryMovementDetailedForAdmin(detailedMovement),
		).resolves.toEqual({ ok: true });

		expect(mocks.requireBusinessRole).toHaveBeenCalledWith([
			"owner",
			"admin",
			"manager",
		]);
		expect(mocks.createInventoryMovementDetailed).toHaveBeenCalledWith({
			...detailedMovement,
			performed_by_user_id: sessionUser.id,
		});
	});

	it("allows owner to create simple stock movement", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "owner",
			roleSource: "membership",
		});
		mocks.getAppUserFn.mockResolvedValue(sessionUser);
		mocks.createStockMovement.mockResolvedValue(undefined);

		await expect(createStockMovementForAdmin(simpleMovement)).resolves.toEqual({
			ok: true,
		});
		expect(mocks.createStockMovement).toHaveBeenCalledWith({
			...simpleMovement,
			performed_by_user_id: sessionUser.id,
		});
	});

	it("allows admin to set product stock", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "admin",
			roleSource: "membership",
		});
		mocks.setProductStock.mockResolvedValue(undefined);

		await expect(setProductStockForAdmin(setStockInput)).resolves.toEqual({
			ok: true,
		});
		expect(mocks.setProductStock).toHaveBeenCalledWith(setStockInput);
	});

	it("blocks cashier on detailed movement write", async () => {
		mocks.requireBusinessRole.mockRejectedValue(new Error("FORBIDDEN"));

		await expect(
			createInventoryMovementDetailedForAdmin(detailedMovement),
		).rejects.toThrow("FORBIDDEN");
		expect(mocks.createInventoryMovementDetailed).not.toHaveBeenCalled();
	});

	it("blocks cashier on set stock", async () => {
		mocks.requireBusinessRole.mockRejectedValue(new Error("FORBIDDEN"));

		await expect(setProductStockForAdmin(setStockInput)).rejects.toThrow(
			"FORBIDDEN",
		);
		expect(mocks.setProductStock).not.toHaveBeenCalled();
	});

	it("uses legacy fallback when roleSource is legacy", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "manager",
			roleSource: "legacy",
			business: null,
		});
		mocks.getAppUserFn.mockResolvedValue({ ...sessionUser, role: "manager" });
		mocks.createInventoryMovementDetailed.mockResolvedValue(undefined);

		await expect(
			createInventoryMovementDetailedForAdmin(detailedMovement),
		).resolves.toEqual({ ok: true });
	});
});
