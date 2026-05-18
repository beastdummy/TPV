import { randomBytes } from "node:crypto";

import { hashPassword } from "../auth/password.server";
import {
	findMembershipByEmailForBusiness,
	findRoleBySlugForBusiness,
	insertBusinessMember,
	insertBusinessRole,
	insertUser,
	listEmployeesForBusiness,
	listRolesForBusiness,
	replaceRolePermissions,
} from "../business-staff/queries.server";
import { BUSINESS_OWNER_ROLE } from "../tenancy/business-roles.types";
import { markStaffStepHandledForBusiness } from "./setup-queries.server";
import {
	getSetupQuickRolePreset,
	type SetupQuickRolePresetKey,
} from "./setup-role-presets";

export type SetupCreateEmployeeInput = {
	name: string;
	email: string;
	role_slug: string;
	pin: string;
};

export async function setupCreateEmployee(
	businessId: string,
	data: SetupCreateEmployeeInput,
) {
	if (data.role_slug === BUSINESS_OWNER_ROLE) {
		throw new Error("No puedes crear otro propietario desde el asistente.");
	}

	const pin = data.pin.trim();
	if (!/^\d{4,8}$/.test(pin)) {
		throw new Error("El PIN debe tener entre 4 y 8 dígitos.");
	}

	const email = data.email.trim().toLowerCase();
	const duplicate = await findMembershipByEmailForBusiness({
		businessId,
		email,
	});
	if (duplicate) {
		throw new Error("Ya existe un empleado con ese email en este negocio.");
	}

	const roles = await listRolesForBusiness(businessId);
	const isDefined = roles.some((role) => role.slug === data.role_slug);
	if (!isDefined) {
		throw new Error(
			"Crea un rol con los botones de roles rápidos o en administración antes de añadir el empleado.",
		);
	}

	const passwordHash = hashPassword(randomBytes(24).toString("base64url"));
	const userId = await insertUser({
		name: data.name.trim(),
		email,
		passwordHash,
		role: "cashier",
	});

	if (!userId) {
		throw new Error("No se pudo crear el usuario del empleado.");
	}

	const membershipId = await insertBusinessMember({
		businessId,
		userId,
		roleSlug: data.role_slug,
		status: "active",
		posPinHash: hashPassword(pin),
	});

	if (!membershipId) {
		throw new Error("No se pudo crear la membresía del empleado.");
	}

	return { ok: true as const, membership_id: membershipId };
}

export async function setupCreateQuickRole(
	businessId: string,
	presetKey: SetupQuickRolePresetKey,
) {
	const preset = getSetupQuickRolePreset(presetKey);
	const existing = await findRoleBySlugForBusiness({
		businessId,
		slug: preset.slug,
	});

	if (existing) {
		return {
			ok: true as const,
			role_id: existing.id,
			slug: preset.slug,
			created: false,
		};
	}

	const roleId = await insertBusinessRole({
		businessId,
		slug: preset.slug,
		name: preset.name,
		description: preset.description,
	});

	if (!roleId) {
		throw new Error("No se pudo crear el rol.");
	}

	await replaceRolePermissions({
		businessId,
		roleId,
		permissionKeys: preset.permissions,
	});

	return {
		ok: true as const,
		role_id: roleId,
		slug: preset.slug,
		created: true,
	};
}

export async function setupSkipStaffStep(businessId: string) {
	await markStaffStepHandledForBusiness(businessId);
	return { ok: true as const };
}

export async function listSetupStaffContext(businessId: string) {
	const [employees, roles] = await Promise.all([
		listEmployeesForBusiness(businessId),
		listRolesForBusiness(businessId),
	]);

	const staffEmployees = employees.filter(
		(employee) => employee.role_slug !== BUSINESS_OWNER_ROLE,
	);

	return {
		employees: staffEmployees.map((employee) => ({
			membership_id: employee.membership_id,
			name: employee.name,
			email: employee.email,
			role_slug: employee.role_slug,
			role_name: employee.role_name,
			has_pin: employee.has_pin,
		})),
		roles: roles.map((role) => ({
			id: role.id,
			slug: role.slug,
			name: role.name,
		})),
		hasCustomRoles: roles.length > 0,
	};
}
