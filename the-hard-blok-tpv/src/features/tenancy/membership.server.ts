import { db } from "../../lib/db.server";
import type { Role } from "../auth/types";
import {
	getDefaultBusiness,
	getMembership,
	getPrimaryMembership,
} from "./queries.server";
import type { BusinessMember, MembershipStatus } from "./types";

type BusinessMemberRow = {
	id: string;
	business_id: string;
	user_id: string;
	role: Role;
	status: MembershipStatus;
	is_primary: boolean;
};

function mapBusinessMember(row: BusinessMemberRow): BusinessMember {
	return {
		id: row.id,
		businessId: row.business_id,
		userId: row.user_id,
		role: row.role,
		status: row.status,
		isPrimary: row.is_primary,
	};
}

function membershipStatusForUser(isActive: boolean): MembershipStatus {
	return isActive ? "active" : "suspended";
}

/**
 * Marca la membresía indicada como primaria si el usuario no tiene otra primaria activa.
 */
export async function ensurePrimaryMembership(params: {
	userId: string;
	businessId: string;
	membershipId: string;
}): Promise<void> {
	const primary = await getPrimaryMembership(params.userId);

	if (primary) {
		if (primary.id === params.membershipId) {
			return;
		}
		if (primary.businessId !== params.businessId) {
			return;
		}
	}

	await db.query(
		`
    UPDATE business_members
    SET is_primary = TRUE, updated_at = NOW()
    WHERE id = $1
      AND user_id = $2
      AND business_id = $3
    `,
		[params.membershipId, params.userId, params.businessId],
	);
}

/**
 * Crea o actualiza la membresía del usuario en el negocio por DEFAULT_BUSINESS_SLUG.
 */
export async function ensureDefaultBusinessMembership(params: {
	userId: string;
	role: Role;
	isActive: boolean;
}): Promise<BusinessMember> {
	const business = await getDefaultBusiness();

	if (!business) {
		throw new Error(
			"Negocio default no encontrado. Ejecuta npm run db:migrate:tenancy.",
		);
	}

	const status = membershipStatusForUser(params.isActive);

	const result = await db.query<BusinessMemberRow>(
		`
    INSERT INTO business_members (business_id, user_id, role, status, is_primary)
    VALUES ($1, $2, $3, $4, FALSE)
    ON CONFLICT (business_id, user_id) DO UPDATE
    SET
      role = EXCLUDED.role,
      status = EXCLUDED.status,
      updated_at = NOW()
    RETURNING id, business_id, user_id, role, status, is_primary
    `,
		[business.id, params.userId, params.role, status],
	);

	const row = result.rows[0];

	if (!row) {
		throw new Error("No se pudo asegurar la membresía en el negocio default.");
	}

	const membership = mapBusinessMember(row);

	await ensurePrimaryMembership({
		userId: params.userId,
		businessId: business.id,
		membershipId: membership.id,
	});

	const refreshed = await getMembership(business.id, params.userId);
	return refreshed ?? membership;
}
