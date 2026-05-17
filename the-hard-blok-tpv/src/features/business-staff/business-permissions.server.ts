import { getCurrentTenantContext } from "../auth/tenant-guards.server";
import type { Role } from "../auth/types";
import { BUSINESS_OWNER_ROLE } from "../tenancy/business-roles.types";
import { BUSINESS_STAFF_ERRORS, BusinessStaffError } from "./errors";
import type { BusinessPermissionKey } from "./permissions";
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
	"settings.view",
	"settings.manage",
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
]);

const LEGACY_CASHIER_PERMISSIONS = new Set<BusinessPermissionKey>([
	"dashboard.view",
	"sales.view",
	"sales.manage",
]);

function legacyPermissionSet(role: Role): Set<BusinessPermissionKey> | null {
	if (role === "owner") {
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

export async function hasBusinessPermission(
	permissionKey: BusinessPermissionKey | string,
): Promise<boolean> {
	const ctx = await getCurrentTenantContext();

	if (!ctx?.business) {
		return false;
	}

	if (ctx.role === BUSINESS_OWNER_ROLE) {
		return true;
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
	for (const key of permissionKeys) {
		if (await hasBusinessPermission(key)) {
			return await requireBusinessPermission(key);
		}
	}

	throw new BusinessStaffError(
		BUSINESS_STAFF_ERRORS.FORBIDDEN,
		"No tienes permiso para esta acción.",
	);
}
