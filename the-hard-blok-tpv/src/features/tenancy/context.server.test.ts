import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getPrimaryMembership: vi.fn(),
}));

vi.mock("./queries.server", () => ({
	getPrimaryMembership: mocks.getPrimaryMembership,
}));

import { resolveDefaultBusinessContext } from "./context.server";

describe("resolveDefaultBusinessContext", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("returns null when user has no primary membership", async () => {
		mocks.getPrimaryMembership.mockResolvedValue(null);

		await expect(resolveDefaultBusinessContext("user-1")).resolves.toBeNull();
	});

	it("returns context from primary active membership", async () => {
		mocks.getPrimaryMembership.mockResolvedValue({
			id: "mem-1",
			businessId: "biz-1",
			userId: "user-1",
			role: "owner",
			status: "active",
			isPrimary: true,
			business: {
				id: "biz-1",
				slug: "mi-cafe",
				name: "Mi Cafe",
				status: "active",
				timezone: "Europe/Madrid",
				currencyCode: "EUR",
			},
		});

		await expect(resolveDefaultBusinessContext("user-1")).resolves.toEqual({
			userId: "user-1",
			businessId: "biz-1",
			businessSlug: "mi-cafe",
			businessName: "Mi Cafe",
			membershipId: "mem-1",
			role: "owner",
		});
	});
});
