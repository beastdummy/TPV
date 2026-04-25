export const ROLE_VALUES = ["owner", "admin", "manager", "cashier"] as const;

export type Role = (typeof ROLE_VALUES)[number];

export type AuthUser = {
	id: string;
	email: string;
	name: string;
	role: Role;
	is_active: boolean;
};

export type SessionUser = Pick<AuthUser, "id" | "email" | "name" | "role">;
