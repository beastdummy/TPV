import { db } from "../../lib/db.server";
import type { CashSessionRow } from "./transaction/schema-types";
import type { CashSessionStatus } from "./transaction/types";

type CashSessionDbRow = {
	id: string;
	business_id: string;
	terminal_id: string;
	status: CashSessionStatus;
	opening_float: string | number;
	closing_amount: string | number | null;
	opened_by_user_id: string;
	closed_by_user_id: string | null;
	opened_at: string;
	closed_at: string | null;
	notes: string;
	created_at: string;
	updated_at: string;
};

function mapCashSessionRow(row: CashSessionDbRow): CashSessionRow {
	return {
		...row,
		opening_float: Number(row.opening_float),
		closing_amount:
			row.closing_amount === null || row.closing_amount === undefined
				? null
				: Number(row.closing_amount),
	};
}

const CASH_SESSION_COLUMNS = `
  id::text,
  business_id::text,
  terminal_id,
  status,
  opening_float::float8 AS opening_float,
  closing_amount::float8 AS closing_amount,
  opened_by_user_id::text,
  closed_by_user_id::text,
  opened_at::text,
  closed_at::text,
  notes,
  created_at::text,
  updated_at::text
`;

export async function findOpenCashSession(
	businessId: string,
	terminalId: string,
): Promise<CashSessionRow | null> {
	const result = await db.query<CashSessionDbRow>(
		`
    SELECT ${CASH_SESSION_COLUMNS}
    FROM cash_sessions
    WHERE business_id = $1
      AND terminal_id = $2
      AND status = 'open'
    LIMIT 1
  `,
		[businessId, terminalId],
	);

	const row = result.rows[0];
	return row ? mapCashSessionRow(row) : null;
}

export async function getCashSessionById(
	businessId: string,
	cashSessionId: string,
): Promise<CashSessionRow | null> {
	const result = await db.query<CashSessionDbRow>(
		`
    SELECT ${CASH_SESSION_COLUMNS}
    FROM cash_sessions
    WHERE business_id = $1
      AND id = $2
    LIMIT 1
  `,
		[businessId, cashSessionId],
	);

	const row = result.rows[0];
	return row ? mapCashSessionRow(row) : null;
}

export async function insertCashSession(data: {
	business_id: string;
	terminal_id: string;
	opening_float: number;
	opened_by_user_id: string;
	notes: string;
}): Promise<CashSessionRow> {
	const result = await db.query<CashSessionDbRow>(
		`
    INSERT INTO cash_sessions (
      business_id,
      terminal_id,
      status,
      opening_float,
      opened_by_user_id,
      notes
    )
    VALUES ($1, $2, 'open', $3, $4, $5)
    RETURNING ${CASH_SESSION_COLUMNS}
  `,
		[
			data.business_id,
			data.terminal_id,
			data.opening_float,
			data.opened_by_user_id,
			data.notes,
		],
	);

	const row = result.rows[0];
	if (!row) {
		throw new Error("No se pudo abrir la sesión de caja.");
	}

	return mapCashSessionRow(row);
}

export async function updateCashSessionStatus(data: {
	business_id: string;
	cash_session_id: string;
	status: CashSessionStatus;
	closed_by_user_id?: string | null;
	closing_amount?: number | null;
	notes?: string;
}): Promise<CashSessionRow> {
	const result = await db.query<CashSessionDbRow>(
		`
    UPDATE cash_sessions
    SET
      status = $3,
      closed_by_user_id = COALESCE($4, closed_by_user_id),
      closing_amount = COALESCE($6, closing_amount),
      closed_at = CASE
        WHEN $3 IN ('closed', 'suspended') THEN COALESCE(closed_at, NOW())
        ELSE closed_at
      END,
      notes = CASE
        WHEN $5::text IS NOT NULL AND $5 <> '' THEN $5
        ELSE notes
      END,
      updated_at = NOW()
    WHERE business_id = $1
      AND id = $2
    RETURNING ${CASH_SESSION_COLUMNS}
  `,
		[
			data.business_id,
			data.cash_session_id,
			data.status,
			data.closed_by_user_id ?? null,
			data.notes ?? null,
			data.closing_amount ?? null,
		],
	);

	const row = result.rows[0];
	if (!row) {
		throw new Error("Sesión de caja no encontrada.");
	}

	return mapCashSessionRow(row);
}

export async function hasPendingSalesForSession(
	cashSessionId: string,
): Promise<boolean> {
	const salesExists = await db.query<{ exists: boolean }>(
		`SELECT (to_regclass('public.sales') IS NOT NULL) AS exists`,
	);
	if (!salesExists.rows[0]?.exists) {
		return false;
	}

	const result = await db.query<{ pending: boolean }>(
		`
    SELECT EXISTS (
      SELECT 1
      FROM sales
      WHERE cash_session_id = $1
        AND status = 'pending'
    ) AS pending
  `,
		[cashSessionId],
	);

	return result.rows[0]?.pending ?? false;
}
