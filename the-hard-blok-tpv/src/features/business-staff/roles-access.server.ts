import { BUSINESS_OWNER_ROLE } from "../tenancy/business-roles.types";
import { requireBusinessPermission } from "./business-permissions.server";
import { BUSINESS_STAFF_ERRORS, BusinessStaffError } from "./errors";
import type { BusinessPermissionKey } from "./permissions";
import {
	countActiveOwnersForBusiness,
	deleteBusinessRole,
	findRoleByNameForBusiness,
	findRoleBySlugForBusiness,
	getRoleForBusiness,
	insertBusinessRole,
	listPermissionKeysForRole,
	listRolesForBusiness,
	replaceRolePermissions,
	updateBusinessRole,
} from "./queries.server";
import { slugifyRoleName } from "./schemas";
import { requireStaffBusinessContext } from "./tenant-context.server";

function assertRoleIsNotOwner(role: { slug: string }) {
	if (role.slug === BUSINESS_OWNER_ROLE) {
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.OWNER_PROTECTED,
			"El rol propietario no se puede modificar.",
		);
	}
}

export async function loadRolesForBusiness() {
	await requireBusinessPermission("roles.view");
	const { businessId } = await requireStaffBusinessContext();
	const [roles, owner_member_count] = await Promise.all([
		listRolesForBusiness(businessId),
		countActiveOwnersForBusiness(businessId),
	]);

	return {
		roles,
		owner: {
			slug: BUSINESS_OWNER_ROLE,
			name: "Propietario",
			description: "Acceso total automático a todos los módulos.",
			member_count: owner_member_count,
			is_system: true,
		},
	};
}

export async function loadRolePermissionsForBusiness(roleId: string) {
	await requireBusinessPermission("roles.view");
	const { businessId } = await requireStaffBusinessContext();

	const role = await getRoleForBusiness({ businessId, roleId });
	if (!role) {
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.NOT_FOUND,
			"Rol no encontrado.",
		);
	}

	assertRoleIsNotOwner(role);

	const permission_keys = await listPermissionKeysForRole({
		businessId,
		roleId,
	});

	return { role, permission_keys };
}

export async function createRoleForBusiness(data: {
	name: string;
	description: string;
	slug?: string;
}) {
	await requireBusinessPermission("roles.manage");
	const { businessId } = await requireStaffBusinessContext();

	const name = data.name.trim();
	const slug = data.slug?.trim() || slugifyRoleName(name);

	if (slug === BUSINESS_OWNER_ROLE) {
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.OWNER_PROTECTED,
			"El slug owner está reservado.",
		);
	}

	const duplicateName = await findRoleByNameForBusiness({ businessId, name });
	if (duplicateName) {
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.DUPLICATE_ROLE_NAME,
			"Ya existe un rol con ese nombre.",
		);
	}

	const duplicateSlug = await findRoleBySlugForBusiness({ businessId, slug });
	if (duplicateSlug) {
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.ROLE_SLUG_ALREADY_EXISTS,
			"Ya existe un rol con ese identificador (slug) en este negocio.",
		);
	}

	const roleId = await insertBusinessRole({
		businessId,
		slug,
		name,
		description: data.description.trim(),
	});

	if (!roleId) {
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.VALIDATION,
			"No se pudo crear el rol.",
		);
	}

	return { ok: true as const, role_id: roleId };
}

export async function updateRoleForBusiness(data: {
	role_id: string;
	name: string;
	description: string;
}) {
	await requireBusinessPermission("roles.manage");
	const { businessId } = await requireStaffBusinessContext();

	const role = await getRoleForBusiness({
		businessId,
		roleId: data.role_id,
	});

	if (!role) {
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.NOT_FOUND,
			"Rol no encontrado.",
		);
	}

	assertRoleIsNotOwner(role);

	const duplicate = await findRoleByNameForBusiness({
		businessId,
		name: data.name.trim(),
		excludeRoleId: data.role_id,
	});
	if (duplicate) {
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.DUPLICATE_ROLE_NAME,
			"Ya existe un rol con ese nombre.",
		);
	}

	await updateBusinessRole({
		businessId,
		roleId: data.role_id,
		name: data.name.trim(),
		description: data.description.trim(),
	});

	return { ok: true as const };
}

export async function saveRolePermissionsForBusiness(data: {
	role_id: string;
	permission_keys: BusinessPermissionKey[];
}) {
	await requireBusinessPermission("roles.manage");
	const { businessId } = await requireStaffBusinessContext();

	const role = await getRoleForBusiness({
		businessId,
		roleId: data.role_id,
	});

	if (!role) {
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.NOT_FOUND,
			"Rol no encontrado.",
		);
	}

	assertRoleIsNotOwner(role);

	await replaceRolePermissions({
		businessId,
		roleId: data.role_id,
		permissionKeys: data.permission_keys,
	});

	return { ok: true as const };
}

export async function deleteRoleForBusiness(roleId: string) {
	await requireBusinessPermission("roles.manage");
	const { businessId } = await requireStaffBusinessContext();

	const role = await getRoleForBusiness({ businessId, roleId });

	if (!role) {
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.NOT_FOUND,
			"Rol no encontrado.",
		);
	}

	if (role.is_system || role.slug === BUSINESS_OWNER_ROLE) {
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.OWNER_PROTECTED,
			"No se puede eliminar este rol.",
		);
	}

	if (role.member_count > 0) {
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.ROLE_IN_USE,
			"No puedes eliminar un rol asignado a empleados.",
		);
	}

	await deleteBusinessRole({ businessId, roleId });

	return { ok: true as const };
}
