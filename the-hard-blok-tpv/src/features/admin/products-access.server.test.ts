import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	requireBusinessRole: vi.fn(),
	getProducts: vi.fn(),
	getCategories: vi.fn(),
	deleteProduct: vi.fn(),
	createProduct: vi.fn(),
	getProductById: vi.fn(),
	updateProduct: vi.fn(),
}));

vi.mock("../auth/tenant-guards.server", () => ({
	requireBusinessRole: mocks.requireBusinessRole,
}));

vi.mock("./queries.server", () => ({
	getProducts: mocks.getProducts,
	getCategories: mocks.getCategories,
	deleteProduct: mocks.deleteProduct,
	createProduct: mocks.createProduct,
	getProductById: mocks.getProductById,
	updateProduct: mocks.updateProduct,
}));

import {
	createProductForAdmin,
	loadCategoriesForProductsPage,
	loadProductByIdForAdmin,
	loadProductsForAdmin,
	removeProductForAdmin,
	updateProductForAdmin,
} from "./products-access.server";

const sampleCreateInput = {
	name: "Café",
	description: "",
	price: 2.5,
	category_id: "bebidas",
	image_url: "",
	tax_rate: 10,
	warehouse: "principal",
	sort_order: 0,
};

const sampleUpdateInput = {
	...sampleCreateInput,
	id: "prod-1",
	is_active: true,
};

describe("products-access.server (tenant-aware)", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("allows owner via membership", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "owner",
			roleSource: "membership",
		});
		mocks.getProducts.mockResolvedValue([{ id: "p1" }]);

		await expect(loadProductsForAdmin()).resolves.toEqual([{ id: "p1" }]);
		expect(mocks.requireBusinessRole).toHaveBeenCalledWith([
			"owner",
			"admin",
			"manager",
		]);
	});

	it("allows admin via membership", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "admin",
			roleSource: "membership",
		});
		mocks.getProducts.mockResolvedValue([]);

		await expect(loadProductsForAdmin()).resolves.toEqual([]);
	});

	it("allows manager via membership", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "manager",
			roleSource: "membership",
		});
		mocks.getProducts.mockResolvedValue([]);

		await expect(loadProductsForAdmin()).resolves.toEqual([]);
	});

	it("denies when requireBusinessRole throws FORBIDDEN", async () => {
		mocks.requireBusinessRole.mockRejectedValue(new Error("FORBIDDEN"));

		await expect(loadProductsForAdmin()).rejects.toThrow("FORBIDDEN");
		expect(mocks.getProducts).not.toHaveBeenCalled();
	});

	it("uses legacy fallback when roleSource is legacy", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "manager",
			roleSource: "legacy",
			business: null,
		});
		mocks.getProducts.mockResolvedValue([{ id: "p2" }]);

		await expect(loadProductsForAdmin()).resolves.toEqual([{ id: "p2" }]);
	});

	it("removeProductForAdmin deletes when access is allowed", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "admin",
			roleSource: "membership",
		});
		mocks.deleteProduct.mockResolvedValue({ ok: true });

		await expect(removeProductForAdmin("prod-1")).resolves.toEqual({
			ok: true,
		});
		expect(mocks.deleteProduct).toHaveBeenCalledWith("prod-1");
	});

	it("loadCategoriesForProductsPage loads categories when allowed", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "manager",
			roleSource: "membership",
		});
		mocks.getCategories.mockResolvedValue([{ id: "cat-1" }]);

		await expect(loadCategoriesForProductsPage()).resolves.toEqual([
			{ id: "cat-1" },
		]);
	});

	it("createProductForAdmin allows create for owner", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "owner",
			roleSource: "membership",
		});
		mocks.createProduct.mockResolvedValue(undefined);

		await expect(createProductForAdmin(sampleCreateInput)).resolves.toEqual({
			ok: true,
		});
		expect(mocks.createProduct).toHaveBeenCalledWith(sampleCreateInput);
	});

	it("updateProductForAdmin allows edit for admin", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "admin",
			roleSource: "membership",
		});
		mocks.updateProduct.mockResolvedValue(undefined);

		await expect(updateProductForAdmin(sampleUpdateInput)).resolves.toEqual({
			ok: true,
		});
	});

	it("loadProductByIdForAdmin allows read for manager", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "manager",
			roleSource: "membership",
		});
		mocks.getProductById.mockResolvedValue({ id: "prod-1" });

		await expect(loadProductByIdForAdmin("prod-1")).resolves.toEqual({
			id: "prod-1",
		});
	});

	it("blocks cashier on create", async () => {
		mocks.requireBusinessRole.mockRejectedValue(new Error("FORBIDDEN"));

		await expect(createProductForAdmin(sampleCreateInput)).rejects.toThrow(
			"FORBIDDEN",
		);
		expect(mocks.createProduct).not.toHaveBeenCalled();
	});

	it("blocks cashier on edit", async () => {
		mocks.requireBusinessRole.mockRejectedValue(new Error("FORBIDDEN"));

		await expect(updateProductForAdmin(sampleUpdateInput)).rejects.toThrow(
			"FORBIDDEN",
		);
		expect(mocks.updateProduct).not.toHaveBeenCalled();
	});

	it("create uses legacy fallback when tenant resolves via users.role", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "manager",
			roleSource: "legacy",
			business: null,
		});
		mocks.createProduct.mockResolvedValue(undefined);

		await expect(createProductForAdmin(sampleCreateInput)).resolves.toEqual({
			ok: true,
		});
	});
});
