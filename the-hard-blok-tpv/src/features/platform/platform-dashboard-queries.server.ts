import { db } from "../../lib/db.server";
import {
	PLATFORM_PLAN_PLACEHOLDER,
	type PlatformBusinessRow,
	type PlatformDashboardData,
	type PlatformDashboardSummary,
} from "./types";

async function tableExists(tableName: string): Promise<boolean> {
	const result = await db.query<{ exists: boolean }>(
		`SELECT (to_regclass($1::text) IS NOT NULL) AS exists`,
		[`public.${tableName}`],
	);
	return result.rows[0]?.exists ?? false;
}

function emptySummary(): PlatformDashboardSummary {
	return {
		totalBusinesses: 0,
		activeBusinesses: 0,
		totalUsers: 0,
		completedSales: 0,
		totalSalesCents: 0,
	};
}

export function buildEmptyPlatformDashboard(): PlatformDashboardData {
	return {
		summary: emptySummary(),
		businesses: [],
	};
}

async function loadSummary(): Promise<PlatformDashboardSummary> {
	const summary = emptySummary();

	if (await tableExists("businesses")) {
		const businesses = await db.query<{
			total: string | null;
			active: string | null;
		}>(
			`
      SELECT
        COUNT(*)::bigint AS total,
        COUNT(*) FILTER (WHERE status = 'active')::bigint AS active
      FROM businesses
      `,
		);
		summary.totalBusinesses = Number(businesses.rows[0]?.total ?? 0);
		summary.activeBusinesses = Number(businesses.rows[0]?.active ?? 0);
	}

	if (await tableExists("users")) {
		const users = await db.query<{ total: string | null }>(
			`
      SELECT COUNT(*)::bigint AS total
      FROM users
      WHERE is_active = TRUE
      `,
		);
		summary.totalUsers = Number(users.rows[0]?.total ?? 0);
	}

	if (await tableExists("sales")) {
		const sales = await db.query<{
			orders: string | null;
			total_cents: string | null;
		}>(
			`
      SELECT
        COUNT(*) FILTER (WHERE status = 'completed')::bigint AS orders,
        COALESCE(
          SUM(CASE WHEN status = 'completed' THEN ROUND(total * 100) END),
          0
        )::bigint AS total_cents
      FROM sales
      `,
		);
		summary.completedSales = Number(sales.rows[0]?.orders ?? 0);
		summary.totalSalesCents = Number(sales.rows[0]?.total_cents ?? 0);
	}

	return summary;
}

type BusinessListRow = {
	id: string;
	name: string;
	slug: string;
	status: string;
	created_at: Date;
	owner_email: string | null;
	member_count: string | null;
};

async function loadBusinessesBase(): Promise<BusinessListRow[]> {
	if (!(await tableExists("businesses"))) {
		return [];
	}

	const membersExist = await tableExists("business_members");

	if (!membersExist) {
		const result = await db.query<BusinessListRow>(
			`
      SELECT
        b.id,
        b.name,
        b.slug,
        b.status,
        b.created_at,
        NULL::text AS owner_email,
        0::bigint AS member_count
      FROM businesses b
      ORDER BY b.created_at DESC
      `,
		);
		return result.rows;
	}

	const result = await db.query<BusinessListRow>(
		`
    SELECT
      b.id,
      b.name,
      b.slug,
      b.status,
      b.created_at,
      (
        SELECT u.email
        FROM business_members bm
        INNER JOIN users u ON u.id = bm.user_id
        WHERE bm.business_id = b.id
          AND bm.role = 'owner'
          AND bm.status = 'active'
        ORDER BY bm.joined_at ASC
        LIMIT 1
      ) AS owner_email,
      (
        SELECT COUNT(*)::bigint
        FROM business_members bm
        WHERE bm.business_id = b.id
          AND bm.status = 'active'
      ) AS member_count
    FROM businesses b
    ORDER BY b.created_at DESC
    `,
	);

	return result.rows;
}

async function loadSalesCountByBusiness(): Promise<Map<string, number>> {
	const counts = new Map<string, number>();

	if (!(await tableExists("sales"))) {
		return counts;
	}

	const result = await db.query<{ business_id: string; sales_count: string }>(
		`
    SELECT
      business_id,
      COUNT(*)::bigint AS sales_count
    FROM sales
    WHERE status = 'completed'
    GROUP BY business_id
    `,
	);

	for (const row of result.rows) {
		counts.set(row.business_id, Number(row.sales_count ?? 0));
	}

	return counts;
}

function mapBusinessRow(
	row: BusinessListRow,
	salesCountByBusiness: Map<string, number>,
): PlatformBusinessRow {
	return {
		id: row.id,
		name: row.name,
		slug: row.slug,
		status: row.status,
		createdAt:
			row.created_at instanceof Date
				? row.created_at.toISOString()
				: String(row.created_at),
		plan: PLATFORM_PLAN_PLACEHOLDER,
		ownerEmail: row.owner_email,
		memberCount: Number(row.member_count ?? 0),
		salesCount: salesCountByBusiness.get(row.id) ?? 0,
	};
}

export async function getPlatformDashboardData(): Promise<PlatformDashboardData> {
	const skeleton = buildEmptyPlatformDashboard();

	try {
		const [summary, businessRows, salesCountByBusiness] = await Promise.all([
			loadSummary(),
			loadBusinessesBase(),
			loadSalesCountByBusiness(),
		]);

		return {
			summary,
			businesses: businessRows.map((row) =>
				mapBusinessRow(row, salesCountByBusiness),
			),
		};
	} catch {
		return skeleton;
	}
}
