import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	requireBusinessRole: vi.fn(),
	getAppUserFn: vi.fn(),
	createSupplier: vi.fn(),
	createPurchaseReceipt: vi.fn(),
}));

vi.mock("../auth/tenant-guards.server", () => ({
	requireBusinessRole: mocks.requireBusinessRole,
}));

vi.mock("../auth/auth.rpc", () => ({
	getAppUserFn: mocks.getAppUserFn,
}));

vi.mock("../purchases/queries.server", () => ({
	createSupplier: mocks.createSupplier,
	createPurchaseReceipt: mocks.createPurchaseReceipt,
}));

import {
	createPurchaseReceiptForAdmin,
	createSupplierForAdmin,
} from "./purchases-write-access.server";

const sessionUser = {
	id: "user-1",
	email: "owner@test.com",
	name: "Owner",
	role: "owner" as const,
};

const supplierInput = {
	name: "Proveedor SA",
	tax_id: "B123",
	email: "a@test.com",
	phone: "600",
};

const receiptInput = {
	supplier_id: "s1",
	warehouse_id: "principal",
	product_id: "p1",
	quantity: 3,
	unit_cost: 12.5,
	notes: "Pedido semanal",
};

describe("purchases-write-access.server (tenant-aware write)", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("allows manager to create supplier", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "manager",
			roleSource: "membership",
		});
		mocks.createSupplier.mockResolvedValue("s-new");

		await expect(createSupplierForAdmin(supplierInput)).resolves.toEqual({
			ok: true,
			supplierId: "s-new",
		});
		expect(mocks.requireBusinessRole).toHaveBeenCalledWith([
			"owner",
			"admin",
			"manager",
		]);
		expect(mocks.createSupplier).toHaveBeenCalledWith(supplierInput);
	});

	it("allows owner to create purchase receipt", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "owner",
			roleSource: "membership",
		});
		mocks.getAppUserFn.mockResolvedValue(sessionUser);
		mocks.createPurchaseReceipt.mockResolvedValue({ id: "r1" });

		await expect(createPurchaseReceiptForAdmin(receiptInput)).resolves.toEqual({
			id: "r1",
		});
		expect(mocks.createPurchaseReceipt).toHaveBeenCalledWith({
			...receiptInput,
			created_by_user_id: sessionUser.id,
		});
	});

	it("allows admin to create purchase receipt", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "admin",
			roleSource: "membership",
		});
		mocks.getAppUserFn.mockResolvedValue(sessionUser);
		mocks.createPurchaseReceipt.mockResolvedValue({ id: "r2" });

		await expect(createPurchaseReceiptForAdmin(receiptInput)).resolves.toEqual({
			id: "r2",
		});
	});

	it("blocks cashier on supplier create", async () => {
		mocks.requireBusinessRole.mockRejectedValue(new Error("FORBIDDEN"));

		await expect(createSupplierForAdmin(supplierInput)).rejects.toThrow(
			"FORBIDDEN",
		);
		expect(mocks.createSupplier).not.toHaveBeenCalled();
	});

	it("blocks cashier on purchase receipt create", async () => {
		mocks.requireBusinessRole.mockRejectedValue(new Error("FORBIDDEN"));

		await expect(createPurchaseReceiptForAdmin(receiptInput)).rejects.toThrow(
			"FORBIDDEN",
		);
		expect(mocks.createPurchaseReceipt).not.toHaveBeenCalled();
	});

	it("uses legacy fallback when roleSource is legacy", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "manager",
			roleSource: "legacy",
			business: null,
		});
		mocks.getAppUserFn.mockResolvedValue({ ...sessionUser, role: "manager" });
		mocks.createPurchaseReceipt.mockResolvedValue({ id: "r-legacy" });

		await expect(createPurchaseReceiptForAdmin(receiptInput)).resolves.toEqual({
			id: "r-legacy",
		});
	});
});
