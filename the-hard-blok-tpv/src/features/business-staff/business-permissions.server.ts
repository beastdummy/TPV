import { getCurrentTenantContext } from "../auth/tenant-guards.server";
import type { Role } from "../auth/types";
import { BUSINESS_STAFF_ERRORS, BusinessStaffError } from "./errors";
import {
	BUSINESS_OWNER_ROLE,
	type BusinessPermissionKey,
	isBusinessOwnerRole,
} from "./permissions";
import { getRolePermissionKeysForBusiness } from "./queries.server";

export { BUSINESS_OWNER_ROLE, isBusinessOwnerRole };

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

function legacyPermissionSet(role: Role): Set<BusinessPermissionKey> | null {
	if (isBusinessOwnerRole(role)) {
		return null;
	}
	if (role === "admin") {
		return LEGACY_ADMIN_PERMISSIONS;
	}
	if (role === "manager") {
		return LEGACY_MANAGER_PERMISSIONS;
	}
	if (role === "cashier") {
		return LEGACY_CASHIER_PERMISSIONS;
	}
	return null;
}

/**
 * Propietario del negocio: acceso total sin consultar business_role_permissions.
 */
export async function hasBusinessPermission(
	permissionKey: BusinessPermissionKey | string,
): Promise<boolean> {
	const ctx = await getCurrentTenantContext();

	if (!ctx) {
		return false;
	}

	if (isBusinessOwnerRole(ctx.role)) {
		return true;
	}

	if (!ctx.business) {
		return false;
	}

	const legacy = legacyPermissionSet(ctx.role);
	if (legacy) {
		return legacy.has(permissionKey as BusinessPermissionKey);
	}

	const custom = await getRolePermissionKeysForBusiness({
		businessId: ctx.business.businessId,
		roleSlug: ctx.role,
	});

	if (custom.size > 0) {
		return custom.has(permissionKey);
	}

	return false;
}

export async function requireBusinessPermission(
	permissionKey: BusinessPermissionKey | string,
) {
	const ctx = await getCurrentTenantContext();

	if (!ctx) {
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.UNAUTHORIZED,
			"No autenticado.",
		);
	}

	if (!ctx.business) {
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.TENANT_NOT_FOUND,
			"No hay negocio activo.",
		);
	}

	if (isBusinessOwnerRole(ctx.role)) {
		return ctx;
	}

	const allowed = await hasBusinessPermission(permissionKey);

	if (!allowed) {
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.FORBIDDEN,
			"No tienes permiso para esta acción.",
		);
	}

	return ctx;
}

export async function requireAnyBusinessPermission(
	permissionKeys: Array<BusinessPermissionKey | string>,
) {
	const ctx = await getCurrentTenantContext();

	if (!ctx) {
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.UNAUTHORIZED,
			"No autenticado.",
		);
	}

	if (!ctx.business) {
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.TENANT_NOT_FOUND,
			"No hay negocio activo.",
		);
	}

	if (isBusinessOwnerRole(ctx.role)) {
		return ctx;
	}

	for (const key of permissionKeys) {
		if (await hasBusinessPermission(key)) {
			return ctx;
		}
	}

	throw new BusinessStaffError(
		BUSINESS_STAFF_ERRORS.FORBIDDEN,
		"No tienes permiso para esta acción.",
	);
}
