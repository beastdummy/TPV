import type { Role } from "../auth/types";
import { type BusinessPermissionKey, isBusinessOwnerRole } from "./permissions";
import { getRolePermissionKeysForBusiness } from "./queries.server";

const LEGACY_ADMIN_PERMISSIONS = new Set<BusinessPermissionKey>([
	"dashboard.view",
	"dashboard.manage",
	"sales.view",
	"sales.manage",
	"products.view",
	"products.create",
	"products.edit",
	"products.delete",
	"products.manage",
	"categories.view",
	"categories.create",
	"categories.edit",
	"categories.delete",
	"categories.manage",
	"inventory.view",
	"inventory.manage",
	"warehouses.view",
	"warehouses.manage",
	"purchases.view",
	"purchases.manage",
	"employees.view",
	"employees.create",
	"employees.edit",
	"employees.manage",
	"roles.view",
	"roles.manage",
	"reports.view",
	"reports.manage",
	"settings.view",
	"settings.manage",
	"audit.view",
	"audit.manage",
]);

const LEGACY_MANAGER_PERMISSIONS = new Set<BusinessPermissionKey>([
	"dashboard.view",
	"sales.view",
	"sales.manage",
	"products.view",
	"products.create",
	"products.edit",
	"categories.view",
	"categories.edit",
	"inventory.view",
	"warehouses.view",
	"purchases.view",
	"employees.view",
	"roles.view",
	"audit.view",
]);

const LEGACY_CASHIER_PERMISSIONS = new Set<BusinessPermissionKey>([
	"dashboard.view",
	"sales.view",
	"sales.manage",
]);

function legacyPermissionSet(
	roleSlug: string,
): Set<BusinessPermissionKey> | null {
	if (isBusinessOwnerRole(roleSlug)) {
		return null;
	}
	if (roleSlug === "admin") {
		return LEGACY_ADMIN_PERMISSIONS;
	}
	if (roleSlug === "manager") {
		return LEGACY_MANAGER_PERMISSIONS;
	}
	if (roleSlug === "cashier") {
		return LEGACY_CASHIER_PERMISSIONS;
	}
	return null;
}

/** Permisos efectivos de un rol de negocio (legacy, owner o custom). */
export async function hasPermissionForBusinessRole(
	businessId: string,
	roleSlug: string,
	permissionKey: BusinessPermissionKey | string,
): Promise<boolean> {
	if (isBusinessOwnerRole(roleSlug)) {
		return true;
	}

	const legacy = legacyPermissionSet(roleSlug);
	if (legacy) {
		return legacy.has(permissionKey as BusinessPermissionKey);
	}

	const custom = await getRolePermissionKeysForBusiness({
		businessId,
		roleSlug,
	});

	if (custom.size > 0) {
		return custom.has(permissionKey);
	}

	return false;
}

export async function requirePermissionForBusinessRole(
	businessId: string,
	roleSlug: string,
	permissionKey: BusinessPermissionKey | string,
) {
	const allowed = await hasPermissionForBusinessRole(
		businessId,
		roleSlug,
		permissionKey,
	);

	if (!allowed) {
		throw new Error("FORBIDDEN");
	}
}

export type { Role };
