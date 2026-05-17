import type { PlatformRole } from "./types";

/** Permisos internos de operación SaaS (The Hard Blok). */
export const PLATFORM_PERMISSIONS = [
	"platform.dashboard.view",
	"platform.businesses.read",
	"platform.businesses.manage",
	"platform.users.read",
	"platform.users.manage",
	"platform.support.read",
	"platform.support.manage",
	"platform.moderation.read",
	"platform.moderation.manage",
	"platform.billing.read",
	"platform.billing.manage",
	"platform.debug.read",
	"platform.features.manage",
] as const;

export type PlatformPermission = (typeof PLATFORM_PERMISSIONS)[number];

const allPermissions = [...PLATFORM_PERMISSIONS] as PlatformPermission[];

const readOnly: PlatformPermission[] = [
	"platform.dashboard.view",
	"platform.businesses.read",
	"platform.users.read",
	"platform.support.read",
	"platform.moderation.read",
	"platform.billing.read",
];

export const PLATFORM_ROLE_PERMISSIONS: Record<
	PlatformRole,
	readonly PlatformPermission[]
> = {
	owner: allPermissions,
	dev: [
		"platform.dashboard.view",
		"platform.businesses.read",
		"platform.users.read",
		"platform.support.read",
		"platform.debug.read",
		"platform.features.manage",
	],
	admin: [
		"platform.dashboard.view",
		"platform.businesses.read",
		"platform.businesses.manage",
		"platform.users.read",
		"platform.users.manage",
		"platform.support.read",
		"platform.support.manage",
	],
	support: [
		"platform.dashboard.view",
		"platform.businesses.read",
		"platform.users.read",
		"platform.support.read",
		"platform.support.manage",
	],
	moderator: [
		"platform.dashboard.view",
		"platform.businesses.read",
		"platform.moderation.read",
		"platform.moderation.manage",
	],
	billing: [
		"platform.dashboard.view",
		"platform.businesses.read",
		"platform.billing.read",
		"platform.billing.manage",
	],
	viewer: readOnly,
};

export function platformRoleHasPermission(
	role: PlatformRole,
	permission: PlatformPermission,
): boolean {
	return PLATFORM_ROLE_PERMISSIONS[role].includes(permission);
}
