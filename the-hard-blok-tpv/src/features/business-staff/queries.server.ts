import { db } from "../../lib/db.server";
import type { BusinessPermissionKey } from "./permissions";
import type {
	BusinessEmployeeRow,
	BusinessRolePermissionRow,
	BusinessRoleRow,
	BusinessStaffMemberStatus,
} from "./types";

export async function listEmployeesForBusiness(
	businessId: string,
): Promise<BusinessEmployeeRow[]> {
	const result = await db.query<{
		membership_id: string;
		user_id: string;
		name: string;
		email: string;
		role_slug: string;
		status: BusinessStaffMemberStatus;
		has_pin: boolean;
		is_primary: boolean;
	}>(
		`
    SELECT
      bm.id AS membership_id,
      bm.user_id,
      u.name,
      u.email,
      bm.role AS role_slug,
      bm.status,
      (bm.pos_pin_hash IS NOT NULL AND bm.pos_pin_hash <> '') AS has_pin,
      bm.is_primary
    FROM business_members bm
    INNER JOIN users u ON u.id = bm.user_id
    WHERE bm.business_id = $1
      AND bm.status IN ('active', 'suspended', 'invited')
    ORDER BY u.name ASC
    `,
		[businessId],
	);

	const roles = await listRolesForBusiness(businessId);
	const roleNameBySlug = new Map(roles.map((role) => [role.slug, role.name]));

	return result.rows.map((row) => ({
		...row,
		role_name:
			row.role_slug === "owner"
				? "Propietario"
				: (roleNameBySlug.get(row.role_slug) ?? row.role_slug),
	}));
}

export async function getEmployeeMembershipForBusiness(params: {
	businessId: string;
	membershipId: string;
}) {
	const result = await db.query<BusinessEmployeeRow>(
		`
    SELECT
      bm.id AS membership_id,
      bm.user_id,
      u.name,
      u.email,
      bm.role AS role_slug,
      bm.status,
      (bm.pos_pin_hash IS NOT NULL AND bm.pos_pin_hash <> '') AS has_pin,
      bm.is_primary
    FROM business_members bm
    INNER JOIN users u ON u.id = bm.user_id
    WHERE bm.business_id = $1
      AND bm.id = $2
    LIMIT 1
    `,
		[params.businessId, params.membershipId],
	);

	const row = result.rows[0];
	if (!row) {
		return null;
	}

	const roles = await listRolesForBusiness(params.businessId);
	const roleName =
		row.role_slug === "owner"
			? "Propietario"
			: (roles.find((role) => role.slug === row.role_slug)?.name ??
				row.role_slug);

	return { ...row, role_name: roleName };
}

export async function findMembershipByEmailForBusiness(params: {
	businessId: string;
	email: string;
}) {
	const result = await db.query<{ membership_id: string }>(
		`
    SELECT bm.id AS membership_id
    FROM business_members bm
    INNER JOIN users u ON u.id = bm.user_id
    WHERE bm.business_id = $1
      AND lower(u.email) = lower($2)
      AND bm.status IN ('active', 'suspended', 'invited')
    LIMIT 1
    `,
		[params.businessId, params.email],
	);

	return result.rows[0] ?? null;
}

export async function listRolesForBusiness(
	businessId: string,
): Promise<BusinessRoleRow[]> {
	const result = await db.query<BusinessRoleRow>(
		`
    SELECT
      br.id,
      br.business_id,
      br.slug,
      br.name,
      br.description,
      br.is_system,
      COUNT(bm.id) FILTER (
        WHERE bm.status IN ('active', 'suspended', 'invited')
      )::int AS member_count
    FROM business_roles br
    LEFT JOIN business_members bm
      ON bm.business_id = br.business_id
      AND bm.role = br.slug
    WHERE br.business_id = $1
    GROUP BY br.id
    ORDER BY br.name ASC
    `,
		[businessId],
	);

	return result.rows;
}

export async function getRoleForBusiness(params: {
	businessId: string;
	roleId: string;
}) {
	const result = await db.query<BusinessRoleRow>(
		`
    SELECT
      br.id,
      br.business_id,
      br.slug,
      br.name,
      br.description,
      br.is_system,
      COUNT(bm.id) FILTER (
        WHERE bm.status IN ('active', 'suspended', 'invited')
      )::int AS member_count
    FROM business_roles br
    LEFT JOIN business_members bm
      ON bm.business_id = br.business_id
      AND bm.role = br.slug
    WHERE br.business_id = $1
      AND br.id = $2
    GROUP BY br.id
    LIMIT 1
    `,
		[params.businessId, params.roleId],
	);

	return result.rows[0] ?? null;
}

export async function findRoleByNameForBusiness(params: {
	businessId: string;
	name: string;
	excludeRoleId?: string;
}) {
	const result = await db.query<{ id: string }>(
		`
    SELECT id
    FROM business_roles
    WHERE business_id = $1
      AND lower(name) = lower($2)
      AND ($3::uuid IS NULL OR id <> $3::uuid)
    LIMIT 1
    `,
		[params.businessId, params.name, params.excludeRoleId ?? null],
	);

	return result.rows[0] ?? null;
}

export async function getRolePermissionKeysForBusiness(params: {
	businessId: string;
	roleSlug: string;
}): Promise<Set<string>> {
	if (params.roleSlug === "owner") {
		return new Set();
	}

	const role = await db.query<{ id: string }>(
		`
    SELECT id
    FROM business_roles
    WHERE business_id = $1
      AND slug = $2
    LIMIT 1
    `,
		[params.businessId, params.roleSlug],
	);

	const roleId = role.rows[0]?.id;
	if (!roleId) {
		return new Set();
	}

	const result = await db.query<BusinessRolePermissionRow>(
		`
    SELECT COALESCE(permission_key, permission) AS permission_key
    FROM business_role_permissions
    WHERE business_id = $1
      AND business_role_id = $2
    `,
		[params.businessId, roleId],
	);

	return new Set(result.rows.map((row) => row.permission_key));
}

export async function replaceRolePermissions(params: {
	businessId: string;
	roleId: string;
	permissionKeys: BusinessPermissionKey[];
}) {
	await db.query(
		`
    DELETE FROM business_role_permissions
    WHERE business_id = $1
      AND business_role_id = $2
    `,
		[params.businessId, params.roleId],
	);

	for (const permissionKey of params.permissionKeys) {
		await db.query(
			`
      INSERT INTO business_role_permissions (
        business_id,
        business_role_id,
        permission,
        permission_key
      )
      VALUES ($1, $2, $3, $3)
      ON CONFLICT (business_id, business_role_id, permission_key) DO NOTHING
      `,
			[params.businessId, params.roleId, permissionKey],
		);
	}
}

export async function listPermissionKeysForRole(params: {
	businessId: string;
	roleId: string;
}): Promise<BusinessPermissionKey[]> {
	const result = await db.query<BusinessRolePermissionRow>(
		`
    SELECT COALESCE(permission_key, permission) AS permission_key
    FROM business_role_permissions
    WHERE business_id = $1
      AND business_role_id = $2
    ORDER BY permission_key ASC
    `,
		[params.businessId, params.roleId],
	);

	return result.rows.map((row) => row.permission_key as BusinessPermissionKey);
}

export async function insertBusinessRole(params: {
	businessId: string;
	slug: string;
	name: string;
	description: string;
}) {
	const result = await db.query<{ id: string }>(
		`
    INSERT INTO business_roles (business_id, slug, name, description, is_system)
    VALUES ($1, $2, $3, $4, FALSE)
    RETURNING id
    `,
		[params.businessId, params.slug, params.name, params.description],
	);

	return result.rows[0]?.id ?? null;
}

export async function updateBusinessRole(params: {
	businessId: string;
	roleId: string;
	name: string;
	description: string;
}) {
	await db.query(
		`
    UPDATE business_roles
    SET name = $3, description = $4, updated_at = NOW()
    WHERE business_id = $1
      AND id = $2
    `,
		[params.businessId, params.roleId, params.name, params.description],
	);
}

export async function deleteBusinessRole(params: {
	businessId: string;
	roleId: string;
}) {
	await db.query(
		`
    DELETE FROM business_roles
    WHERE business_id = $1
      AND id = $2
      AND is_system = FALSE
    `,
		[params.businessId, params.roleId],
	);
}

export async function insertUser(params: {
	name: string;
	email: string;
	passwordHash: string;
	role: string;
}) {
	const result = await db.query<{ id: string }>(
		`
    INSERT INTO users (name, email, password_hash, role, is_active)
    VALUES ($1, $2, $3, $4, TRUE)
    RETURNING id
    `,
		[params.name, params.email, params.passwordHash, params.role],
	);

	return result.rows[0]?.id ?? null;
}

export async function updateUserBasics(params: {
	userId: string;
	name: string;
	email: string;
}) {
	await db.query(
		`
    UPDATE users
    SET name = $2, email = $3, updated_at = NOW()
    WHERE id = $1
    `,
		[params.userId, params.name, params.email],
	);
}

export async function insertBusinessMember(params: {
	businessId: string;
	userId: string;
	roleSlug: string;
	status: BusinessStaffMemberStatus;
	posPinHash: string | null;
}) {
	const result = await db.query<{ id: string }>(
		`
    INSERT INTO business_members (
      business_id,
      user_id,
      role,
      status,
      is_primary,
      pos_pin_hash
    )
    VALUES ($1, $2, $3, $4, FALSE, $5)
    RETURNING id
    `,
		[
			params.businessId,
			params.userId,
			params.roleSlug,
			params.status,
			params.posPinHash,
		],
	);

	return result.rows[0]?.id ?? null;
}

export async function updateBusinessMember(params: {
	membershipId: string;
	businessId: string;
	roleSlug: string;
	status: BusinessStaffMemberStatus;
	posPinHash: string | null;
	clearPin: boolean;
}) {
	await db.query(
		`
    UPDATE business_members
    SET
      role = $3,
      status = $4,
      pos_pin_hash = CASE
        WHEN $6 THEN NULL
        WHEN $5 IS NOT NULL THEN $5
        ELSE pos_pin_hash
      END,
      updated_at = NOW()
    WHERE id = $1
      AND business_id = $2
    `,
		[
			params.membershipId,
			params.businessId,
			params.roleSlug,
			params.status,
			params.posPinHash,
			params.clearPin,
		],
	);
}

export async function countActiveOwnersForBusiness(
	businessId: string,
): Promise<number> {
	const result = await db.query<{ count: string }>(
		`
    SELECT COUNT(*)::text AS count
    FROM business_members
    WHERE business_id = $1
      AND role = 'owner'
      AND status = 'active'
    `,
		[businessId],
	);

	return Number(result.rows[0]?.count ?? 0);
}
