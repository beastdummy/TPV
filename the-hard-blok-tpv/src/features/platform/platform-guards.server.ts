import { getActivePlatformAdminByUserId } from "./platform-admin-queries.server";
import {
	type PlatformPermission,
	platformRoleHasPermission,
} from "./platform-permissions";
import {
	PLATFORM_DASHBOARD_ROLES,
	type PlatformAdmin,
	type PlatformRole,
} from "./types";

export const PLATFORM_AUTH_ERRORS = {
	UNAUTHORIZED: "UNAUTHORIZED",
	FORBIDDEN: "FORBIDDEN",
} as const;

export async function requirePlatformAdmin(
	allowedRoles: PlatformRole[] = PLATFORM_DASHBOARD_ROLES,
): Promise<{
	user: { id: string; email: string; name: string };
	platformAdmin: PlatformAdmin;
}> {
	const { getAppUserFn } = await import("../auth/auth.rpc");
	const user = await getAppUserFn();

	if (!user) {
		throw new Error(PLATFORM_AUTH_ERRORS.UNAUTHORIZED);
	}

	const platformAdmin = await getActivePlatformAdminByUserId(user.id);

	if (!platformAdmin || !allowedRoles.includes(platformAdmin.role)) {
		throw new Error(PLATFORM_AUTH_ERRORS.FORBIDDEN);
	}

	return {
		user: {
			id: user.id,
			email: user.email,
			name: user.name,
		},
		platformAdmin,
	};
}

export async function requirePlatformPermission(
	permission: PlatformPermission,
): Promise<{
	user: { id: string; email: string; name: string };
	platformAdmin: PlatformAdmin;
}> {
	const context = await requirePlatformAdmin();

	if (!platformRoleHasPermission(context.platformAdmin.role, permission)) {
		throw new Error(PLATFORM_AUTH_ERRORS.FORBIDDEN);
	}

	return context;
}
