/** Rol fijo por negocio; no es un business_roles personalizado. */
export const BUSINESS_OWNER_ROLE = "owner" as const;

/**
 * Slugs legacy en business_members hasta migrar a business_roles.
 * Los nuevos roles custom vivirán en business_roles.slug.
 */
export const LEGACY_BUSINESS_MEMBER_ROLES = [
	"admin",
	"manager",
	"cashier",
] as const;

export type LegacyBusinessMemberRole =
	(typeof LEGACY_BUSINESS_MEMBER_ROLES)[number];

export type BusinessRoleSlug =
	| typeof BUSINESS_OWNER_ROLE
	| LegacyBusinessMemberRole
	| (string & {});

export type BusinessRoleRecord = {
	id: string;
	businessId: string;
	slug: string;
	name: string;
	description: string;
	isSystem: boolean;
};

export type BusinessRolePermissionRecord = {
	id: string;
	businessRoleId: string;
	permission: string;
};
