import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	query: vi.fn(),
}));

vi.mock("../../lib/db.server", () => ({
	db: { query: mocks.query },
}));

import {
	buildEmptyPlatformDashboard,
	getPlatformDashboardData,
} from "./platform-dashboard-queries.server";

describe("platform dashboard queries", () => {
	afterEach(() => {
		vi.resetAllMocks();
	});

	it("returns empty dashboard when core tables are missing", async () => {
		mocks.query.mockResolvedValue({ rows: [{ exists: false }] });

		const data = await getPlatformDashboardData();

		expect(data).toEqual(buildEmptyPlatformDashboard());
	});

	it("lists businesses with owner email and metrics", async () => {
		mocks.query.mockImplementation(async (sql: string) => {
			if (sql.includes("to_regclass")) {
				return { rows: [{ exists: true }] };
			}
			if (sql.includes("owner_email")) {
				return {
					rows: [
						{
							id: "biz-1",
							name: "Cafe Ada",
							slug: "cafe-ada",
							status: "active",
							created_at: new Date("2026-05-01T10:00:00.000Z"),
							owner_email: "ada@example.com",
							member_count: "2",
						},
					],
				};
			}
			if (sql.includes("GROUP BY business_id")) {
				return {
					rows: [{ business_id: "biz-1", sales_count: "3" }],
				};
			}
			if (sql.includes("FROM sales") && sql.includes("total_cents")) {
				return { rows: [{ orders: "3", total_cents: "1500" }] };
			}
			if (sql.includes("FROM users") && sql.includes("is_active")) {
				return { rows: [{ total: "5" }] };
			}
			if (sql.includes("FROM businesses") && sql.includes("FILTER")) {
				return { rows: [{ total: "2", active: "1" }] };
			}
			return { rows: [] };
		});

		const data = await getPlatformDashboardData();

		expect(data.summary).toEqual({
			totalBusinesses: 2,
			activeBusinesses: 1,
			totalUsers: 5,
			completedSales: 3,
			totalSalesCents: 1500,
		});
		expect(data.businesses).toEqual([
			{
				id: "biz-1",
				name: "Cafe Ada",
				slug: "cafe-ada",
				status: "active",
				createdAt: "2026-05-01T10:00:00.000Z",
				plan: "starter",
				ownerEmail: "ada@example.com",
				memberCount: 2,
				salesCount: 3,
			},
		]);
	});

	it("returns skeleton when a query fails", async () => {
		mocks.query
			.mockResolvedValueOnce({ rows: [{ exists: true }] })
			.mockRejectedValueOnce(new Error("relation missing"));

		const data = await getPlatformDashboardData();

		expect(data.summary.totalBusinesses).toBe(0);
		expect(data.businesses).toEqual([]);
	});
});
