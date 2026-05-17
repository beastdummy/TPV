import { redirect } from "@tanstack/react-router";

import { getAppUserFn } from "./auth.rpc";
import { CATALOG_MANAGEMENT_ROLES, type Role } from "./types";

export async function requireAuthForRoute(redirectTo: string) {
	const user = await getAppUserFn();

	if (!user) {
		throw redirect({
			to: "/login",
			search: { redirect: redirectTo },
		});
	}

	return user;
}

export async function requireRoleForRoute(roles: Role[], redirectTo: string) {
	const user = await requireAuthForRoute(redirectTo);

	if (!roles.includes(user.role)) {
		throw redirect({ to: "/dashboard" });
	}

	return user;
}

function redirectForTenantAuthError(error: unknown, redirectTo: string): never {
	if (error instanceof Error && error.message === "UNAUTHORIZED") {
		throw redirect({
			to: "/login",
			search: { redirect: redirectTo },
		});
	}

	if (error instanceof Error && error.message === "FORBIDDEN") {
		throw redirect({ to: "/dashboard" });
	}

	throw error;
}

/**
 * Patrón oficial de migración tenant-aware en rutas (client-safe).
 * 1) requireRoleForRoute — legacy users.role (exact match)
 * 2) ensureCatalogManagementTenantFn — business_members + jerarquía
 */
export async function requireCatalogManagementTenantForRoute(
	redirectTo: string,
) {
	await requireRoleForRoute(CATALOG_MANAGEMENT_ROLES, redirectTo);

	const { ensureCatalogManagementTenantFn } = await import("./auth.rpc");

	try {
		return await ensureCatalogManagementTenantFn();
	} catch (error) {
		redirectForTenantAuthError(error, redirectTo);
	}
}
