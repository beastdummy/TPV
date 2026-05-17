import { db } from "../../lib/db.server";
import type { PlatformAdmin, PlatformRole } from "./types";

type PlatformAdminRow = {
	id: string;
	user_id: string;
	role: PlatformRole;
	is_active: boolean;
};

function mapPlatformAdmin(row: PlatformAdminRow): PlatformAdmin {
	return {
		id: row.id,
		userId: row.user_id,
		role: row.role,
		isActive: row.is_active,
	};
}

async function platformAdminsTableExists(): Promise<boolean> {
	const result = await db.query<{ exists: boolean }>(
		`SELECT (to_regclass('public.platform_admins') IS NOT NULL) AS exists`,
	);
	return result.rows[0]?.exists ?? false;
}

export async function getActivePlatformAdminByUserId(
	userId: string,
): Promise<PlatformAdmin | null> {
	if (!(await platformAdminsTableExists())) {
		return null;
	}

	const result = await db.query<PlatformAdminRow>(
		`
    SELECT id, user_id, role, is_active
    FROM platform_admins
    WHERE user_id = $1
      AND is_active = TRUE
    LIMIT 1
    `,
		[userId],
	);

	const row = result.rows[0];
	return row ? mapPlatformAdmin(row) : null;
}
