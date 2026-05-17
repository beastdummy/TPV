import { db } from "../../lib/db.server";
import type { Role } from "../auth/types";
import type {
	Business,
	BusinessMember,
	BusinessStatus,
	MembershipStatus,
} from "./types";

type BusinessRow = {
	id: string;
	slug: string;
	name: string;
	status: BusinessStatus;
	timezone: string;
	currency_code: string;
};

type BusinessMemberRow = {
	id: string;
	business_id: string;
	user_id: string;
	role: Role;
	status: MembershipStatus;
	is_primary: boolean;
};

function mapBusiness(row: BusinessRow): Business {
	return {
		id: row.id,
		slug: row.slug,
		name: row.name,
		status: row.status,
		timezone: row.timezone,
		currencyCode: row.currency_code,
	};
}

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

export async function getBusinessBySlug(
	slug: string,
): Promise<Business | null> {
	const result = await db.query<BusinessRow>(
		`
    SELECT id, slug, name, status, timezone, currency_code
    FROM businesses
    WHERE slug = $1
    LIMIT 1
    `,
		[slug],
	);

	const row = result.rows[0];
	return row ? mapBusiness(row) : null;
}

export async function getMembership(
	businessId: string,
	userId: string,
): Promise<BusinessMember | null> {
	const result = await db.query<BusinessMemberRow>(
		`
    SELECT id, business_id, user_id, role, status, is_primary
    FROM business_members
    WHERE business_id = $1 AND user_id = $2
    LIMIT 1
    `,
		[businessId, userId],
	);

	const row = result.rows[0];
	return row ? mapBusinessMember(row) : null;
}

type PrimaryMembershipRow = {
	membership_id: string;
	business_id: string;
	user_id: string;
	role: Role;
	membership_status: MembershipStatus;
	is_primary: boolean;
	slug: string;
	name: string;
	business_status: BusinessStatus;
	timezone: string;
	currency_code: string;
};

export async function getPrimaryMembership(
	userId: string,
): Promise<(BusinessMember & { business: Business }) | null> {
	const result = await db.query<PrimaryMembershipRow>(
		`
    SELECT
      m.id AS membership_id,
      m.business_id,
      m.user_id,
      m.role,
      m.status AS membership_status,
      m.is_primary,
      b.slug,
      b.name,
      b.status AS business_status,
      b.timezone,
      b.currency_code
    FROM business_members m
    INNER JOIN businesses b ON b.id = m.business_id
    WHERE m.user_id = $1
      AND m.is_primary = TRUE
      AND m.status = 'active'
    LIMIT 1
    `,
		[userId],
	);

	const row = result.rows[0];
	if (!row) {
		return null;
	}

	return {
		id: row.membership_id,
		businessId: row.business_id,
		userId: row.user_id,
		role: row.role,
		status: row.membership_status,
		isPrimary: row.is_primary,
		business: {
			id: row.business_id,
			slug: row.slug,
			name: row.name,
			status: row.business_status,
			timezone: row.timezone,
			currencyCode: row.currency_code,
		},
	};
}
