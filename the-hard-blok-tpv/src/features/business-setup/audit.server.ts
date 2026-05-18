import { db } from "../../lib/db.server";

import type { BusinessAuditAction, BusinessAuditLogRow } from "./types";

export type LogBusinessAuditInput = {
	businessId: string;
	actorUserId?: string | null;
	actorMemberId?: string | null;
	action: BusinessAuditAction | string;
	entityType?: string | null;
	entityId?: string | null;
	metadata?: Record<string, unknown>;
};

export async function logBusinessAuditEvent(
	input: LogBusinessAuditInput,
): Promise<void> {
	await db.query(
		`
    INSERT INTO business_audit_logs (
      business_id,
      actor_user_id,
      actor_member_id,
      action,
      entity_type,
      entity_id,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
    `,
		[
			input.businessId,
			input.actorUserId ?? null,
			input.actorMemberId ?? null,
			input.action,
			input.entityType ?? null,
			input.entityId ?? null,
			JSON.stringify(input.metadata ?? {}),
		],
	);
}

export async function listBusinessAuditLogs(
	businessId: string,
	limit = 50,
): Promise<BusinessAuditLogRow[]> {
	const result = await db.query<{
		id: string;
		action: string;
		entity_type: string | null;
		entity_id: string | null;
		metadata: Record<string, unknown>;
		created_at: string;
		actor_user_name: string | null;
	}>(
		`
    SELECT
      bal.id::text,
      bal.action,
      bal.entity_type,
      bal.entity_id,
      bal.metadata,
      bal.created_at::text,
      u.name AS actor_user_name
    FROM business_audit_logs bal
    LEFT JOIN users u ON u.id = bal.actor_user_id
    WHERE bal.business_id = $1
    ORDER BY bal.created_at DESC
    LIMIT $2
    `,
		[businessId, limit],
	);

	return result.rows;
}
