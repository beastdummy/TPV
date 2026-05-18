import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	requireBusinessRole: vi.fn(),
	getCategories: vi.fn(),
	createCategory: vi.fn(),
	updateCategory: vi.fn(),
	deleteCategoryIfEmpty: vi.fn(),
}));

vi.mock("../auth/tenant-guards.server", () => ({
	requireBusinessRole: mocks.requireBusinessRole,
}));

vi.mock("./queries.server", () => ({
	getCategories: mocks.getCategories,
	createCategory: mocks.createCategory,
	updateCategory: mocks.updateCategory,
	deleteCategoryIfEmpty: mocks.deleteCategoryIfEmpty,
}));

import {
	createCategoryForAdmin,
	loadCategoriesForAdmin,
	removeCategoryForAdmin,
	updateCategoryForAdmin,
} from "./categories-access.server";

const sampleCategory = {
	id: "bebidas",
	name: "Bebidas",
	description: "",
	image_url: "",
	sort_order: 1,
	is_active: true,
};

describe("categories-access.server (tenant-aware)", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("allows owner to list categories", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "owner",
			roleSource: "membership",
		});
		mocks.getCategories.mockResolvedValue([sampleCategory]);

		await expect(loadCategoriesForAdmin()).resolves.toEqual([sampleCategory]);
		expect(mocks.requireBusinessRole).toHaveBeenCalledWith([
			"owner",
			"admin",
			"manager",
		]);
	});

	it("allows admin to create category", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "admin",
			roleSource: "membership",
		});
		mocks.createCategory.mockResolvedValue(undefined);

		await expect(createCategoryForAdmin(sampleCategory)).resolves.toEqual({
			ok: true,
		});
	});

	it("allows manager to update category", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "manager",
			roleSource: "membership",
		});
		mocks.updateCategory.mockResolvedValue(undefined);

		await expect(updateCategoryForAdmin(sampleCategory)).resolves.toEqual({
			ok: true,
		});
	});

	it("denies cashier on list", async () => {
		mocks.requireBusinessRole.mockRejectedValue(new Error("FORBIDDEN"));

		await expect(loadCategoriesForAdmin()).rejects.toThrow("FORBIDDEN");
		expect(mocks.getCategories).not.toHaveBeenCalled();
	});

	it("blocks cashier on create", async () => {
		mocks.requireBusinessRole.mockRejectedValue(new Error("FORBIDDEN"));

		await expect(createCategoryForAdmin(sampleCategory)).rejects.toThrow(
			"FORBIDDEN",
		);
		expect(mocks.createCategory).not.toHaveBeenCalled();
	});

	it("blocks cashier on delete", async () => {
		mocks.requireBusinessRole.mockRejectedValue(new Error("FORBIDDEN"));

		await expect(removeCategoryForAdmin("bebidas")).rejects.toThrow(
			"FORBIDDEN",
		);
		expect(mocks.deleteCategoryIfEmpty).not.toHaveBeenCalled();
	});

	it("uses legacy fallback when roleSource is legacy", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "manager",
			roleSource: "legacy",
			business: null,
		});
		mocks.getCategories.mockResolvedValue([]);

		await expect(loadCategoriesForAdmin()).resolves.toEqual([]);
	});

	it("removeCategoryForAdmin deletes when allowed", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "admin",
			roleSource: "membership",
		});
		mocks.deleteCategoryIfEmpty.mockResolvedValue({ ok: true });

		await expect(removeCategoryForAdmin("bebidas")).resolves.toEqual({
			ok: true,
		});
	});
});
