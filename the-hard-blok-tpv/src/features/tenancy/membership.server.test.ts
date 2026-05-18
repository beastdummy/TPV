import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	query: vi.fn(),
	getPrimaryMembership: vi.fn(),
}));

vi.mock("../../lib/db.server", () => ({
	db: { query: mocks.query },
}));

vi.mock("./queries.server", () => ({
	getPrimaryMembership: mocks.getPrimaryMembership,
}));

import { ensurePrimaryMembership } from "./membership.server";

describe("ensurePrimaryMembership", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("no-ops when another primary membership already exists on a different business", async () => {
		mocks.getPrimaryMembership.mockResolvedValue({
			id: "mem-other",
			businessId: "biz-other",
			userId: "user-1",
			role: "owner",
			status: "active",
			isPrimary: true,
			business: {
				id: "biz-other",
				slug: "other",
				name: "Other",
				status: "active",
				timezone: "Europe/Madrid",
				currencyCode: "EUR",
			},
		});

		await ensurePrimaryMembership({
			userId: "user-1",
			businessId: "biz-default",
			membershipId: "mem-default",
		});

		expect(mocks.query).not.toHaveBeenCalled();
	});

	it("marks membership primary when user has no primary yet", async () => {
		mocks.getPrimaryMembership.mockResolvedValue(null);
		mocks.query.mockResolvedValue({ rows: [] });

		await ensurePrimaryMembership({
			userId: "user-1",
			businessId: "biz-1",
			membershipId: "mem-1",
		});

		expect(mocks.query).toHaveBeenCalledWith(
			expect.stringContaining("SET is_primary = TRUE"),
			["mem-1", "user-1", "biz-1"],
		);
	});

	it("no-ops when membership is already primary", async () => {
		mocks.getPrimaryMembership.mockResolvedValue({
			id: "mem-1",
			businessId: "biz-1",
			userId: "user-1",
			role: "owner",
			status: "active",
			isPrimary: true,
			business: {
				id: "biz-1",
				slug: "cafe",
				name: "Cafe",
				status: "active",
				timezone: "Europe/Madrid",
				currencyCode: "EUR",
			},
		});

		await ensurePrimaryMembership({
			userId: "user-1",
			businessId: "biz-1",
			membershipId: "mem-1",
		});

		expect(mocks.query).not.toHaveBeenCalled();
	});
});
