import { resolveDefaultBusinessContext } from "../tenancy/context.server";
import type { BusinessContext } from "../tenancy/types";
import { getAppUserFn } from "./auth.rpc";
import type { Role, SessionUser } from "./types";

export const TENANT_AUTH_ERRORS = {
	UNAUTHORIZED: "UNAUTHORIZED",
	FORBIDDEN: "FORBIDDEN",
	TENANT_NOT_FOUND: "TENANT_NOT_FOUND",
} as const;

export type TenantAuthErrorCode =
	(typeof TENANT_AUTH_ERRORS)[keyof typeof TENANT_AUTH_ERRORS];

export function createTenantAuthError(code: TenantAuthErrorCode): Error {
	return new Error(code);
}

/** owner > admin > manager > cashier */
export const ROLE_RANK: Record<Role, number> = {
	owner: 4,
	admin: 3,
	manager: 2,
	cashier: 1,
};

export function roleMeetsRequirement(
	userRole: Role,
	requiredRole: Role,
): boolean {
	return ROLE_RANK[userRole] >= ROLE_RANK[requiredRole];
}

/**
 * Comprueba si el rol del usuario cumple al menos uno de los requisitos
 * (jerarquía: un owner satisface requisito manager, etc.).
 */
export function hasBusinessRole(userRole: Role, allowedRoles: Role[]): boolean {
	if (allowedRoles.length === 0) {
		return false;
	}

	return allowedRoles.some((required) =>
		roleMeetsRequirement(userRole, required),
	);
}

export type TenantContext = {
	user: SessionUser;
	business: BusinessContext;
	role: Role;
	roleSource: "membership";
};

export type LegacyTenantContext = {
	user: SessionUser;
	business: null;
	role: Role;
	roleSource: "legacy";
};

export type CurrentTenantContext = TenantContext | LegacyTenantContext;

/**
 * Usuario autenticado + rol efectivo (membresía primaria activa o users.role legacy).
 */
export async function getCurrentTenantContext(): Promise<CurrentTenantContext | null> {
	const user = await getAppUserFn();

	if (!user) {
		return null;
	}

	const business = await resolveDefaultBusinessContext(user.id);

	if (business) {
		return {
			user,
			business,
			role: business.role,
			roleSource: "membership",
		};
	}

	return {
		user,
		business: null,
		role: user.role,
		roleSource: "legacy",
	};
}

/**
 * Exige sesión y negocio tenant resuelto (membresía primaria, sin fallback legacy).
 */
export async function requireTenantContext(): Promise<TenantContext> {
	const ctx = await getCurrentTenantContext();

	if (!ctx) {
		throw createTenantAuthError(TENANT_AUTH_ERRORS.UNAUTHORIZED);
	}

	if (!ctx.business) {
		throw createTenantAuthError(TENANT_AUTH_ERRORS.TENANT_NOT_FOUND);
	}

	return {
		user: ctx.user,
		business: ctx.business,
		role: ctx.role,
		roleSource: "membership",
	};
}

/**
 * Exige rol en el negocio (business_members) o, si no hay contexto tenant,
 * users.role como compatibilidad legacy.
 */
export async function requireBusinessRole(
	allowedRoles: Role[],
): Promise<CurrentTenantContext> {
	const ctx = await getCurrentTenantContext();

	if (!ctx) {
		throw createTenantAuthError(TENANT_AUTH_ERRORS.UNAUTHORIZED);
	}

	if (!hasBusinessRole(ctx.role, allowedRoles)) {
		throw createTenantAuthError(TENANT_AUTH_ERRORS.FORBIDDEN);
	}

	return ctx;
}
