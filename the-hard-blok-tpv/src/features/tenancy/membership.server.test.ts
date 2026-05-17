import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getDefaultBusiness: vi.fn(),
	getMembership: vi.fn(),
	getPrimaryMembership: vi.fn(),
	query: vi.fn(),
}));

vi.mock("../../lib/db.server", () => ({
	db: { query: mocks.query },
}));

vi.mock("./queries.server", () => ({
	getDefaultBusiness: mocks.getDefaultBusiness,
	getMembership: mocks.getMembership,
	getPrimaryMembership: mocks.getPrimaryMembership,
}));

import {
	ensureDefaultBusinessMembership,
	ensurePrimaryMembership,
} from "./membership.server";

describe("ensurePrimaryMembership", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("does nothing when another business is already primary", async () => {
		mocks.getPrimaryMembership.mockResolvedValue({
			id: "mem-other",
			businessId: "biz-other",
			userId: "user-1",
			role: "cashier",
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

	it("sets primary when user has no primary membership", async () => {
		mocks.getPrimaryMembership.mockResolvedValue(null);

		await ensurePrimaryMembership({
			userId: "user-1",
			businessId: "biz-default",
			membershipId: "mem-default",
		});

		expect(mocks.query).toHaveBeenCalledWith(
			expect.stringContaining("SET is_primary = TRUE"),
			["mem-default", "user-1", "biz-default"],
		);
	});
});

describe("ensureDefaultBusinessMembership", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("throws when default business is missing", async () => {
		mocks.getDefaultBusiness.mockResolvedValue(null);

		await expect(
			ensureDefaultBusinessMembership({
				userId: "user-1",
				role: "cashier",
				isActive: true,
			}),
		).rejects.toThrow(/db:migrate:tenancy/);
	});

	it("upserts membership and ensures primary", async () => {
		mocks.getDefaultBusiness.mockResolvedValue({
			id: "biz-default",
			slug: "default",
			name: "The Hard Blok",
			status: "active",
			timezone: "Europe/Madrid",
			currencyCode: "EUR",
		});
		mocks.query.mockResolvedValue({
			rows: [
				{
					id: "mem-1",
					business_id: "biz-default",
					user_id: "user-1",
					role: "manager",
					status: "active",
					is_primary: false,
				},
			],
		});
		mocks.getPrimaryMembership.mockResolvedValue(null);
		mocks.getMembership.mockResolvedValue({
			id: "mem-1",
			businessId: "biz-default",
			userId: "user-1",
			role: "manager",
			status: "active",
			isPrimary: true,
		});

		const membership = await ensureDefaultBusinessMembership({
			userId: "user-1",
			role: "manager",
			isActive: true,
		});

		expect(mocks.query).toHaveBeenCalledWith(
			expect.stringContaining("INSERT INTO business_members"),
			["biz-default", "user-1", "manager", "active"],
		);
		expect(membership.isPrimary).toBe(true);
	});

	it("uses suspended status when user is inactive", async () => {
		mocks.getDefaultBusiness.mockResolvedValue({
			id: "biz-default",
			slug: "default",
			name: "The Hard Blok",
			status: "active",
			timezone: "Europe/Madrid",
			currencyCode: "EUR",
		});
		mocks.query.mockResolvedValue({
			rows: [
				{
					id: "mem-1",
					business_id: "biz-default",
					user_id: "user-1",
					role: "cashier",
					status: "suspended",
					is_primary: false,
				},
			],
		});
		mocks.getPrimaryMembership.mockResolvedValue(null);
		mocks.getMembership.mockResolvedValue({
			id: "mem-1",
			businessId: "biz-default",
			userId: "user-1",
			role: "cashier",
			status: "suspended",
			isPrimary: true,
		});

		await ensureDefaultBusinessMembership({
			userId: "user-1",
			role: "cashier",
			isActive: false,
		});

		expect(mocks.query).toHaveBeenCalledWith(
			expect.stringContaining("INSERT INTO business_members"),
			["biz-default", "user-1", "cashier", "suspended"],
		);
	});
});
