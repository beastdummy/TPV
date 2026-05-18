import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	requireBusinessRole: vi.fn(),
	getCategories: vi.fn(),
	getProducts: vi.fn(),
}));

vi.mock("../auth/tenant-guards.server", () => ({
	requireBusinessRole: mocks.requireBusinessRole,
}));

vi.mock("./queries.server", () => ({
	getCategories: mocks.getCategories,
	getProducts: mocks.getProducts,
}));

import { loadCatalogDashboardForAdmin } from "./catalog-dashboard-access.server";

describe("loadCatalogDashboardForAdmin", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("loads categories and products when tenant role is allowed", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "manager",
			roleSource: "membership",
		});
		mocks.getCategories.mockResolvedValue([{ id: "cat-1", is_active: true }]);
		mocks.getProducts.mockResolvedValue([
			{ id: "p1", is_active: true },
			{ id: "p2", is_active: false },
		]);

		await expect(loadCatalogDashboardForAdmin()).resolves.toEqual({
			categories: [{ id: "cat-1", is_active: true }],
			products: [
				{ id: "p1", is_active: true },
				{ id: "p2", is_active: false },
			],
		});

		expect(mocks.requireBusinessRole).toHaveBeenCalledTimes(2);
		expect(mocks.requireBusinessRole).toHaveBeenCalledWith([
			"owner",
			"admin",
			"manager",
		]);
	});

	it("denies when requireBusinessRole throws FORBIDDEN", async () => {
		mocks.requireBusinessRole.mockRejectedValue(new Error("FORBIDDEN"));

		await expect(loadCatalogDashboardForAdmin()).rejects.toThrow("FORBIDDEN");
		expect(mocks.getCategories).not.toHaveBeenCalled();
		expect(mocks.getProducts).not.toHaveBeenCalled();
	});

	it("works with legacy fallback roleSource", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "admin",
			roleSource: "legacy",
			business: null,
		});
		mocks.getCategories.mockResolvedValue([]);
		mocks.getProducts.mockResolvedValue([]);

		await expect(loadCatalogDashboardForAdmin()).resolves.toEqual({
			categories: [],
			products: [],
		});
	});
});
