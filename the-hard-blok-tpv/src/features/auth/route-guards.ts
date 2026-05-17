import { redirect } from "@tanstack/react-router";

import { getAppUserFn } from "./auth.rpc";
import {
	CATALOG_MANAGEMENT_ROLES,
	POS_OPERATION_ROLES,
	type Role,
} from "./types";

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

/**
 * Patrón híbrido para TPV (/sales): legacy users.role + business_members.
 */
export async function requirePosOperationTenantForRoute(redirectTo: string) {
	await requireRoleForRoute(POS_OPERATION_ROLES, redirectTo);

	const { ensurePosOperationTenantFn } = await import("./auth.rpc");

	try {
		return await ensurePosOperationTenantFn();
	} catch (error) {
		redirectForTenantAuthError(error, redirectTo);
	}
}

function redirectForPlatformAuthError(
	error: unknown,
	redirectTo: string,
): never {
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
 * Solo operadores SaaS (tabla platform_admins), no owners de negocio.
 */
export async function requireBusinessPermissionForRoute(
	permissionKey: string,
	redirectTo: string,
) {
	await requireAuthForRoute(redirectTo);

	const { ensureBusinessPermissionFn } = await import(
		"../business-staff/staff.rpc"
	);

	try {
		return await ensureBusinessPermissionFn({
			data: { permission: permissionKey },
		});
	} catch (error) {
		if (error instanceof Error && error.message === "UNAUTHORIZED") {
			throw redirect({
				to: "/login",
				search: { redirect: redirectTo },
			});
		}

		if (
			error instanceof Error &&
			(error.message === "FORBIDDEN" || error.message === "TENANT_NOT_FOUND")
		) {
			throw redirect({ to: "/dashboard" });
		}

		throw error;
	}
}

export async function requirePlatformAdminForRoute(redirectTo: string) {
	await requireAuthForRoute(redirectTo);

	const { ensurePlatformAdminFn } = await import("../platform/platform.rpc");

	try {
		return await ensurePlatformAdminFn();
	} catch (error) {
		redirectForPlatformAuthError(error, redirectTo);
	}
}
