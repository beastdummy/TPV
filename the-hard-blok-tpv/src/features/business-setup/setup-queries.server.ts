import { db } from "../../lib/db.server";
import type { SetupProductStockLine } from "./types";

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
	const result = await db.query<{ exists: boolean }>(
		`
    SELECT EXISTS (
      SELECT 1
      FROM product_stock
      WHERE quantity > 0
    ) AS exists
    `,
	);
	return Boolean(result.rows[0]?.exists);
}

export async function listProductStockLinesForSetup(): Promise<
	SetupProductStockLine[]
> {
	const result = await db.query<{
		product_id: string;
		product_name: string;
		warehouse_id: string;
		warehouse_name: string;
		quantity: number;
	}>(
		`
    SELECT
      ps.product_id::text,
      p.name AS product_name,
      ps.warehouse_id,
      w.name AS warehouse_name,
      ps.quantity::float8 AS quantity
    FROM product_stock ps
    JOIN products p ON p.id = ps.product_id
    JOIN warehouses w ON w.id = ps.warehouse_id
    WHERE p.is_active = TRUE
      AND w.is_active = TRUE
      AND ps.quantity > 0
    ORDER BY w.name ASC, p.name ASC
    `,
	);

	return result.rows;
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

export async function isBusinessDetailsConfirmed(
	businessId: string,
): Promise<boolean> {
	const result = await db.query<{ confirmed: boolean }>(
		`
    SELECT (
      setup_business_confirmed_at IS NOT NULL
      OR COALESCE(settings->'setup'->>'business_confirmed', '') IN ('true', 't', '1')
    ) AS confirmed
    FROM businesses
    WHERE id = $1
    `,
		[businessId],
	);
	return Boolean(result.rows[0]?.confirmed);
}

export async function markBusinessDetailsConfirmed(businessId: string) {
	await db.query(
		`
    UPDATE businesses
    SET setup_business_confirmed_at = COALESCE(setup_business_confirmed_at, NOW()),
        settings = jsonb_set(
          COALESCE(settings, '{}'::jsonb),
          '{setup,business_confirmed}',
          'true'::jsonb,
          true
        ),
        updated_at = NOW()
    WHERE id = $1
    `,
		[businessId],
	);
}

export async function isInventoryReviewedForBusiness(
	businessId: string,
): Promise<boolean> {
	const result = await db.query<{ reviewed: boolean }>(
		`
    SELECT COALESCE(
      (settings->'setup'->>'inventory_reviewed') IN ('true', 't', '1'),
      FALSE
    ) AS reviewed
    FROM businesses
    WHERE id = $1
    `,
		[businessId],
	);
	return Boolean(result.rows[0]?.reviewed);
}

export async function markInventoryReviewedForBusiness(businessId: string) {
	await db.query(
		`
    UPDATE businesses
    SET settings = jsonb_set(
      COALESCE(settings, '{}'::jsonb),
      '{setup,inventory_reviewed}',
      'true'::jsonb,
      true
    ),
    updated_at = NOW()
    WHERE id = $1
    `,
		[businessId],
	);
}

export async function isCashConfiguredForBusiness(
	businessId: string,
): Promise<boolean> {
	const result = await db.query<{ configured: boolean }>(
		`
    SELECT COALESCE(
      (settings->'setup'->>'cash_configured') IN ('true', 't', '1'),
      FALSE
    ) AS configured
    FROM businesses
    WHERE id = $1
    `,
		[businessId],
	);
	return Boolean(result.rows[0]?.configured);
}

export async function getCashOpeningFloatForBusiness(
	businessId: string,
): Promise<number> {
	const result = await db.query<{ opening_float: string | null }>(
		`
    SELECT settings->'setup'->>'cash_opening_float' AS opening_float
    FROM businesses
    WHERE id = $1
    `,
		[businessId],
	);
	const value = Number(result.rows[0]?.opening_float ?? 0);
	return Number.isFinite(value) ? value : 0;
}

export async function isStaffStepHandledForBusiness(
	businessId: string,
): Promise<boolean> {
	const result = await db.query<{ handled: boolean }>(
		`
    SELECT COALESCE(
      (settings->'setup'->>'staff_step_handled') IN ('true', 't', '1'),
      FALSE
    ) AS handled
    FROM businesses
    WHERE id = $1
    `,
		[businessId],
	);
	return Boolean(result.rows[0]?.handled);
}

export async function markStaffStepHandledForBusiness(businessId: string) {
	await db.query(
		`
    UPDATE businesses
    SET settings = jsonb_set(
      COALESCE(settings, '{}'::jsonb),
      '{setup,staff_step_handled}',
      'true'::jsonb,
      true
    ),
    updated_at = NOW()
    WHERE id = $1
    `,
		[businessId],
	);
}

export async function markCashConfiguredForBusiness(
	businessId: string,
	openingFloat: number,
) {
	await db.query(
		`
    UPDATE businesses
    SET settings = jsonb_set(
      jsonb_set(
        COALESCE(settings, '{}'::jsonb),
        '{setup,cash_configured}',
        'true'::jsonb,
        true
      ),
      '{setup,cash_opening_float}',
      to_jsonb($2::numeric),
      true
    ),
    updated_at = NOW()
    WHERE id = $1
    `,
		[businessId, openingFloat],
	);
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
