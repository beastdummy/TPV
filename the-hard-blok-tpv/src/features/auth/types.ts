/**
 * Roles legacy en users / business_members (tenant).
 * Sustituibles por business_roles personalizados; "owner" sigue siendo fijo.
 */
export const ROLE_VALUES = ["owner", "admin", "manager", "cashier"] as const;

export type Role = (typeof ROLE_VALUES)[number];
export const CATALOG_MANAGEMENT_ROLES: Role[] = ["owner", "admin", "manager"];
export const POS_OPERATION_ROLES: Role[] = [
	"owner",
	"admin",
	"manager",
	"cashier",
];

export type AuthUser = {
	id: string;
	email: string;
	name: string;
	role: Role;
	is_active: boolean;
};

export type SessionUser = Pick<AuthUser, "id" | "email" | "name" | "role">;
