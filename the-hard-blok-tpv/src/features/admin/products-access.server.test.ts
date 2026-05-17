import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	requireBusinessRole: vi.fn(),
	getProducts: vi.fn(),
	getCategories: vi.fn(),
	deleteProduct: vi.fn(),
}));

vi.mock("../auth/tenant-guards.server", () => ({
	requireBusinessRole: mocks.requireBusinessRole,
}));

vi.mock("./queries.server", () => ({
	getProducts: mocks.getProducts,
	getCategories: mocks.getCategories,
	deleteProduct: mocks.deleteProduct,
}));

import {
	loadCategoriesForProductsPage,
	loadProductsForAdmin,
	removeProductForAdmin,
} from "./products-access.server";

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
});
