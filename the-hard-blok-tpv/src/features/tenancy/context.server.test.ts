import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getDefaultBusiness: vi.fn(),
	getBusinessBySlug: vi.fn(),
	getMembership: vi.fn(),
	getPrimaryMembership: vi.fn(),
	getDefaultBusinessConfig: vi.fn(),
}));

vi.mock("./config.server", () => ({
	getDefaultBusinessConfig: mocks.getDefaultBusinessConfig,
}));

vi.mock("./queries.server", () => ({
	getDefaultBusiness: mocks.getDefaultBusiness,
	getBusinessBySlug: mocks.getBusinessBySlug,
	getMembership: mocks.getMembership,
	getPrimaryMembership: mocks.getPrimaryMembership,
}));

import { resolveDefaultBusinessContext } from "./context.server";

describe("resolveDefaultBusinessContext", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("returns null when default business does not exist", async () => {
		mocks.getDefaultBusinessConfig.mockReturnValue({
			slug: "default",
			name: "The Hard Blok",
		});
		mocks.getDefaultBusiness.mockResolvedValue(null);
		mocks.getBusinessBySlug.mockResolvedValue(null);

		await expect(resolveDefaultBusinessContext("user-1")).resolves.toBeNull();
	});

	it("returns context for active membership on default business", async () => {
		mocks.getDefaultBusinessConfig.mockReturnValue({
			slug: "default",
			name: "The Hard Blok",
		});
		mocks.getDefaultBusiness.mockResolvedValue({
			id: "biz-1",
			slug: "default",
			name: "The Hard Blok",
			status: "active",
			timezone: "Europe/Madrid",
			currencyCode: "EUR",
		});
		mocks.getMembership.mockResolvedValue({
			id: "mem-1",
			businessId: "biz-1",
			userId: "user-1",
			role: "manager",
			status: "active",
			isPrimary: true,
		});

		await expect(resolveDefaultBusinessContext("user-1")).resolves.toEqual({
			userId: "user-1",
			businessId: "biz-1",
			businessSlug: "default",
			businessName: "The Hard Blok",
			membershipId: "mem-1",
			role: "manager",
		});
	});

	it("returns null when user has no active membership on default business", async () => {
		mocks.getDefaultBusinessConfig.mockReturnValue({
			slug: "default",
			name: "The Hard Blok",
		});
		mocks.getDefaultBusiness.mockResolvedValue({
			id: "biz-1",
			slug: "default",
			name: "The Hard Blok",
			status: "active",
			timezone: "Europe/Madrid",
			currencyCode: "EUR",
		});
		mocks.getMembership.mockResolvedValue(null);
		mocks.getPrimaryMembership.mockResolvedValue(null);

		await expect(resolveDefaultBusinessContext("user-1")).resolves.toBeNull();
	});
});
