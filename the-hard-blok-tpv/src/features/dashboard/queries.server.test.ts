import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	query: vi.fn(),
}));

vi.mock("../../lib/db.server", () => ({
	db: { query: mocks.query },
}));

import {
	buildEmptyDashboardData,
	buildEmptyDayBuckets,
	getDashboardData,
} from "./queries.server";

describe("dashboard queries", () => {
	afterEach(() => {
		vi.resetAllMocks();
	});

	it("returns zeroed dashboard when sales table is missing", async () => {
		mocks.query.mockResolvedValueOnce({ rows: [{ exists: false }] });

		const data = await getDashboardData({ range: "today" });

		expect(data.totals).toEqual({
			totalSalesCents: 0,
			orders: 0,
			averageTicketCents: 0,
			cashCents: 0,
			cardCents: 0,
			cancelledOrders: 0,
		});
		expect(data.salesByEmployee).toEqual([]);
		expect(data.topProducts).toEqual([]);
		expect(data.salesByDay).toHaveLength(1);
	});

	it("returns empty metrics when sales exist but there are no rows", async () => {
		mocks.query
			.mockResolvedValueOnce({ rows: [{ exists: true }] })
			.mockResolvedValueOnce({ rows: [{ exists: true }] })
			.mockResolvedValueOnce({ rows: [{}] })
			.mockResolvedValueOnce({ rows: [] })
			.mockResolvedValueOnce({ rows: [] })
			.mockResolvedValueOnce({ rows: [] });

		const data = await getDashboardData({ range: "7d", businessId: null });

		expect(data.totals.orders).toBe(0);
		expect(data.salesByDay).toHaveLength(7);
		expect(data.salesByEmployee).toEqual([]);
		expect(data.topProducts).toEqual([]);
	});

	it("queries sales by created_by_user_id instead of legacy user_id", async () => {
		mocks.query
			.mockResolvedValueOnce({ rows: [{ exists: true }] })
			.mockResolvedValueOnce({ rows: [{ exists: true }] })
			.mockResolvedValueOnce({ rows: [{}] })
			.mockResolvedValueOnce({ rows: [] })
			.mockResolvedValueOnce({ rows: [] })
			.mockResolvedValueOnce({ rows: [] });

		await getDashboardData({ range: "today" });

		const employeeSql = mocks.query.mock.calls.find(
			([sql]) => typeof sql === "string" && sql.includes("created_by_user_id"),
		)?.[0];

		expect(employeeSql).toContain("created_by_user_id");
		expect(employeeSql).not.toContain("s.user_id");
	});

	it("returns skeleton instead of throwing when queries fail", async () => {
		mocks.query
			.mockResolvedValueOnce({ rows: [{ exists: true }] })
			.mockResolvedValueOnce({ rows: [{ exists: true }] })
			.mockRejectedValueOnce(new Error("column does not exist"));

		const data = await getDashboardData({ range: "30d" });

		expect(data.totals.totalSalesCents).toBe(0);
		expect(data.salesByDay).toHaveLength(30);
	});

	it("buildEmptyDayBuckets covers each day in range", () => {
		const start = new Date(2026, 4, 10, 0, 0, 0, 0);
		const end = new Date(2026, 4, 13, 0, 0, 0, 0);
		const buckets = buildEmptyDayBuckets(start, end);

		expect(Array.from(buckets.keys())).toEqual([
			"2026-05-10",
			"2026-05-11",
			"2026-05-12",
		]);
	});

	it("buildEmptyDashboardData matches range metadata", () => {
		const start = new Date("2026-05-01T00:00:00");
		const end = new Date("2026-05-02T00:00:00");
		const data = buildEmptyDashboardData({ range: "today", start, end });

		expect(data.range).toBe("today");
		expect(data.periodStart).toBe(start.toISOString());
		expect(data.topProducts).toEqual([]);
	});
});
