import { db } from "../../lib/db.server";

export async function countActiveWarehouses(): Promise<number> {
	const result = await db.query<{ count: string }>(
		`
    SELECT COUNT(*)::text AS count
    FROM warehouses
    WHERE is_active = true
    `,
	);
	return Number(result.rows[0]?.count ?? 0);
}

export async function countActiveCategories(): Promise<number> {
	const result = await db.query<{ count: string }>(
		`
    SELECT COUNT(*)::text AS count
    FROM categories
    WHERE is_active = true
    `,
	);
	return Number(result.rows[0]?.count ?? 0);
}

export async function countActiveProducts(): Promise<number> {
	const result = await db.query<{ count: string }>(
		`
    SELECT COUNT(*)::text AS count
    FROM products
    WHERE is_active = true
    `,
	);
	return Number(result.rows[0]?.count ?? 0);
}

export async function hasInitialStockRecorded(): Promise<boolean> {
	const result = await db.query<{ exists: number }>(
		`
    SELECT 1 AS exists
    WHERE EXISTS (
      SELECT 1 FROM purchase_receipts LIMIT 1
    )
    OR EXISTS (
      SELECT 1 FROM product_stock WHERE quantity > 0 LIMIT 1
    )
    OR EXISTS (
      SELECT 1 FROM stock_movements WHERE movement_type = 'in' LIMIT 1
    )
    LIMIT 1
    `,
	);
	return Boolean(result.rows[0]);
}

export async function countCashSessionsForBusiness(
	businessId: string,
): Promise<number> {
	const result = await db.query<{ count: string }>(
		`
    SELECT COUNT(*)::text AS count
    FROM cash_sessions
    WHERE business_id = $1
    `,
		[businessId],
	);
	return Number(result.rows[0]?.count ?? 0);
}

export async function hasOpenCashSessionForBusiness(
	businessId: string,
): Promise<boolean> {
	const result = await db.query<{ exists: number }>(
		`
    SELECT 1 AS exists
    FROM cash_sessions
    WHERE business_id = $1
      AND status = 'open'
    LIMIT 1
    `,
		[businessId],
	);
	return Boolean(result.rows[0]);
}

export async function getBusinessSetupCompletedAt(
	businessId: string,
): Promise<string | null> {
	const result = await db.query<{ setup_completed_at: string | null }>(
		`
    SELECT setup_completed_at::text
    FROM businesses
    WHERE id = $1
    `,
		[businessId],
	);
	return result.rows[0]?.setup_completed_at ?? null;
}

export async function markBusinessSetupCompleted(businessId: string) {
	await db.query(
		`
    UPDATE businesses
    SET setup_completed_at = COALESCE(setup_completed_at, NOW()),
        updated_at = NOW()
    WHERE id = $1
    `,
		[businessId],
	);
}

export async function countActiveEmployeesForBusiness(
	businessId: string,
): Promise<number> {
	const result = await db.query<{ count: string }>(
		`
    SELECT COUNT(*)::text AS count
    FROM business_members
    WHERE business_id = $1
      AND status = 'active'
      AND role <> 'owner'
    `,
		[businessId],
	);
	return Number(result.rows[0]?.count ?? 0);
}
