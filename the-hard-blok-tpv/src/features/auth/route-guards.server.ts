import { redirect } from "@tanstack/react-router";

import { requireAuthForRoute } from "./route-guards";
import type { Role } from "./types";

/**
 * Tenant-aware route guard para handlers SSR directos (no importar desde .tsx de ruta).
 */
export async function requireBusinessRoleForRoute(
	allowedRoles: Role[],
	redirectTo: string,
) {
	await requireAuthForRoute(redirectTo);

	const { requireBusinessRole, TENANT_AUTH_ERRORS } = await import(
		"./tenant-guards.server"
	);

	try {
		return await requireBusinessRole(allowedRoles);
	} catch (error) {
		if (
			error instanceof Error &&
			error.message === TENANT_AUTH_ERRORS.UNAUTHORIZED
		) {
			throw redirect({
				to: "/login",
				search: { redirect: redirectTo },
			});
		}

		if (
			error instanceof Error &&
			error.message === TENANT_AUTH_ERRORS.FORBIDDEN
		) {
			throw redirect({ to: "/dashboard" });
		}

		throw error;
	}
}

/** @deprecated Usar requireCatalogManagementTenantForRoute en archivos de ruta. */
export async function requireCatalogManagementForRoute(redirectTo: string) {
	const { CATALOG_MANAGEMENT_ROLES } = await import("./types");
	const { requireRoleForRoute } = await import("./route-guards");

	await requireRoleForRoute(CATALOG_MANAGEMENT_ROLES, redirectTo);
	return await requireBusinessRoleForRoute(
		CATALOG_MANAGEMENT_ROLES,
		redirectTo,
	);
}
