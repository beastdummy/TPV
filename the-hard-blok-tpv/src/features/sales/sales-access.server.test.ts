import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	requireBusinessRole: vi.fn(),
	getSalesCatalog: vi.fn(),
}));

vi.mock("../auth/tenant-guards.server", () => ({
	requireBusinessRole: mocks.requireBusinessRole,
}));

vi.mock("./queries.server", () => ({
	getSalesCatalog: mocks.getSalesCatalog,
}));

import { loadSalesCatalogForPos } from "./sales-access.server";

const sampleCatalog = {
	categories: [
		{
			id: "bebidas",
			name: "Bebidas",
			description: "",
			sort_order: 1,
		},
	],
	products: [
		{
			id: "p1",
			name: "Café",
			price: 2.5,
			image_url: "",
			category_id: "bebidas",
			sort_order: 1,
		},
	],
};

describe("sales-access.server (tenant-aware read)", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("allows manager to read sales catalog", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "manager",
			roleSource: "membership",
		});
		mocks.getSalesCatalog.mockResolvedValue(sampleCatalog);

		await expect(loadSalesCatalogForPos()).resolves.toEqual(sampleCatalog);
		expect(mocks.requireBusinessRole).toHaveBeenCalledWith([
			"owner",
			"admin",
			"manager",
			"cashier",
		]);
		expect(mocks.getSalesCatalog).toHaveBeenCalled();
	});

	it("allows owner to read sales catalog", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "owner",
			roleSource: "membership",
		});
		mocks.getSalesCatalog.mockResolvedValue(sampleCatalog);

		await expect(loadSalesCatalogForPos()).resolves.toEqual(sampleCatalog);
	});

	it("allows admin via membership", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "admin",
			roleSource: "membership",
		});
		mocks.getSalesCatalog.mockResolvedValue(sampleCatalog);

		await expect(loadSalesCatalogForPos()).resolves.toEqual(sampleCatalog);
	});

	it("allows cashier to read sales catalog (POS)", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "cashier",
			roleSource: "membership",
		});
		mocks.getSalesCatalog.mockResolvedValue(sampleCatalog);

		await expect(loadSalesCatalogForPos()).resolves.toEqual(sampleCatalog);
	});

	it("blocks access when POS role is insufficient", async () => {
		mocks.requireBusinessRole.mockRejectedValue(new Error("FORBIDDEN"));

		await expect(loadSalesCatalogForPos()).rejects.toThrow("FORBIDDEN");
		expect(mocks.getSalesCatalog).not.toHaveBeenCalled();
	});

	it("uses legacy fallback when roleSource is legacy", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "cashier",
			roleSource: "legacy",
			business: null,
		});
		mocks.getSalesCatalog.mockResolvedValue(sampleCatalog);

		await expect(loadSalesCatalogForPos()).resolves.toEqual(sampleCatalog);
	});
});
