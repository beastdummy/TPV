import { db } from "../../lib/db.server";
import type { PosOperatorSessionRow, PosOperatorSessionStatus } from "./types";

export async function lockActiveSessionsForTerminal(params: {
	businessId: string;
	terminalId: string;
}) {
	await db.query(
		`
    UPDATE pos_operator_sessions
    SET
      status = 'locked',
      locked_at = NOW(),
      updated_at = NOW()
    WHERE business_id = $1
      AND terminal_id = $2
      AND status = 'active'
    `,
		[params.businessId, params.terminalId],
	);
}

export async function insertPosOperatorSession(params: {
	businessId: string;
	terminalId: string;
	operatorMemberId: string;
	operatorUserId: string;
	operatorName: string;
	operatorRole: string;
}): Promise<PosOperatorSessionRow> {
	const result = await db.query<PosOperatorSessionRow>(
		`
    INSERT INTO pos_operator_sessions (
      business_id,
      terminal_id,
      operator_member_id,
      operator_user_id,
      operator_name,
      operator_role,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'active')
    RETURNING
      id,
      business_id,
      terminal_id,
      operator_member_id,
      operator_user_id,
      operator_name,
      operator_role,
      status,
      started_at::text,
      last_seen_at::text,
      locked_at::text
    `,
		[
			params.businessId,
			params.terminalId,
			params.operatorMemberId,
			params.operatorUserId,
			params.operatorName,
			params.operatorRole,
		],
	);

	const row = result.rows[0];
	if (!row) {
		throw new Error("POS_SESSION_INSERT_FAILED");
	}

	return row;
}

export async function getPosOperatorSessionById(params: {
	businessId: string;
	sessionId: string;
}): Promise<PosOperatorSessionRow | null> {
	const result = await db.query<PosOperatorSessionRow>(
		`
    SELECT
      id,
      business_id,
      terminal_id,
      operator_member_id,
      operator_user_id,
      operator_name,
      operator_role,
      status,
      started_at::text,
      last_seen_at::text,
      locked_at::text
    FROM pos_operator_sessions
    WHERE business_id = $1
      AND id = $2
    LIMIT 1
    `,
		[params.businessId, params.sessionId],
	);

	return result.rows[0] ?? null;
}

export async function touchPosOperatorSession(sessionId: string) {
	await db.query(
		`
    UPDATE pos_operator_sessions
    SET last_seen_at = NOW(), updated_at = NOW()
    WHERE id = $1
      AND status = 'active'
    `,
		[sessionId],
	);
}

export async function lockPosOperatorSessionById(sessionId: string) {
	await db.query(
		`
    UPDATE pos_operator_sessions
    SET
      status = 'locked',
      locked_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
      AND status = 'active'
    `,
		[sessionId],
	);
}

export async function getActivePosOperatorSessionForTerminal(params: {
	businessId: string;
	terminalId: string;
}): Promise<PosOperatorSessionRow | null> {
	const result = await db.query<PosOperatorSessionRow>(
		`
    SELECT
      id,
      business_id,
      terminal_id,
      operator_member_id,
      operator_user_id,
      operator_name,
      operator_role,
      status,
      started_at::text,
      last_seen_at::text,
      locked_at::text
    FROM pos_operator_sessions
    WHERE business_id = $1
      AND terminal_id = $2
      AND status = 'active'
    ORDER BY started_at DESC
    LIMIT 1
    `,
		[params.businessId, params.terminalId],
	);

	return result.rows[0] ?? null;
}

export function isSessionActive(row: {
	status: PosOperatorSessionStatus;
}): boolean {
	return row.status === "active";
}
