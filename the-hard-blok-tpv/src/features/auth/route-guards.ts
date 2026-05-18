import { redirect } from "@tanstack/react-router";
import { BUSINESS_OWNER_ROLE } from "../tenancy/business-roles.types";
import { getAppUserFn, getSessionRedirectContextFn } from "./auth.rpc";
import {
	resolvePostLoginRedirect,
	shouldRedirectAuthenticatedFromAuthPage,
} from "./post-login-redirect";
import {
	CATALOG_MANAGEMENT_ROLES,
	POS_OPERATION_ROLES,
	type Role,
} from "./types";

export async function throwPostLoginRedirect(
	redirectTo: string,
): Promise<never> {
	const sessionCtx = await getSessionRedirectContextFn();
	const target = resolvePostLoginRedirect(sessionCtx);

	if (target === "/login") {
		throw redirect({
			to: "/login",
			search: { redirect: redirectTo },
		});
	}

	throw redirect({ to: target });
}

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

export async function redirectAuthenticatedFromAuthPages() {
	const sessionCtx = await getSessionRedirectContextFn();

	if (!shouldRedirectAuthenticatedFromAuthPage(sessionCtx)) {
		return;
	}

	throw redirect({ to: resolvePostLoginRedirect(sessionCtx) });
}

export async function requireSetupPageForRoute(redirectTo: string) {
	const sessionCtx = await getSessionRedirectContextFn();

	if (!sessionCtx.authenticated) {
		throw redirect({
			to: "/login",
			search: { redirect: redirectTo },
		});
	}

	const target = resolvePostLoginRedirect(sessionCtx);

	if (target === "/platform") {
		throw redirect({ to: "/platform" });
	}

	if (target === "/register") {
		throw redirect({ to: "/register" });
	}

	if (target === "/dashboard") {
		throw redirect({ to: "/dashboard" });
	}

	if (sessionCtx.membershipRole !== BUSINESS_OWNER_ROLE) {
		await throwPostLoginRedirect(redirectTo);
	}
}

export async function requireDashboardPageForRoute(redirectTo: string) {
	const sessionCtx = await getSessionRedirectContextFn();

	if (!sessionCtx.authenticated) {
		throw redirect({
			to: "/login",
			search: { redirect: redirectTo },
		});
	}

	const target = resolvePostLoginRedirect(sessionCtx);

	if (target === "/platform") {
		throw redirect({ to: "/platform" });
	}

	if (target === "/register") {
		throw redirect({ to: "/register" });
	}

	if (target === "/setup") {
		throw redirect({ to: "/setup" });
	}
}

export async function requireRoleForRoute(roles: Role[], redirectTo: string) {
	const user = await requireAuthForRoute(redirectTo);
	const sessionCtx = await getSessionRedirectContextFn();
	const effectiveRole = sessionCtx.membershipRole ?? user.role;

	if (!roles.includes(effectiveRole)) {
		await throwPostLoginRedirect(redirectTo);
	}

	return user;
}

async function redirectForTenantAuthError(
	error: unknown,
	redirectTo: string,
): Promise<never> {
	if (error instanceof Error && error.message === "UNAUTHORIZED") {
		throw redirect({
			to: "/login",
			search: { redirect: redirectTo },
		});
	}

	if (error instanceof Error && error.message === "FORBIDDEN") {
		await throwPostLoginRedirect(redirectTo);
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
		await redirectForTenantAuthError(error, redirectTo);
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
		await redirectForTenantAuthError(error, redirectTo);
	}
}

async function redirectForPlatformAuthError(
	error: unknown,
	redirectTo: string,
): Promise<never> {
	if (error instanceof Error && error.message === "UNAUTHORIZED") {
		throw redirect({
			to: "/login",
			search: { redirect: redirectTo },
		});
	}

	if (error instanceof Error && error.message === "FORBIDDEN") {
		await throwPostLoginRedirect(redirectTo);
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
			await throwPostLoginRedirect(redirectTo);
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
		await redirectForPlatformAuthError(error, redirectTo);
	}
}
