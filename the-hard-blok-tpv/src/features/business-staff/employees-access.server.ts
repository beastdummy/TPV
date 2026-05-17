import { randomBytes } from "node:crypto";

import type { z } from "zod";

import { hashPassword } from "../auth/password.server";
import { BUSINESS_OWNER_ROLE } from "../tenancy/business-roles.types";
import { requireBusinessPermission } from "./business-permissions.server";
import { BUSINESS_STAFF_ERRORS, BusinessStaffError } from "./errors";
import {
	findMembershipByEmailForBusiness,
	getEmployeeMembershipForBusiness,
	insertBusinessMember,
	insertUser,
	listEmployeesForBusiness,
	listRolesForBusiness,
	updateBusinessMember,
	updateUserBasics,
} from "./queries.server";
import type { createEmployeeSchema, updateEmployeeSchema } from "./schemas";
import { requireStaffBusinessContext } from "./tenant-context.server";

type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

async function assertAssignableRole(businessId: string, roleSlug: string) {
	if (roleSlug === BUSINESS_OWNER_ROLE) {
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.OWNER_PROTECTED,
			"No puedes asignar el rol propietario desde aquí.",
		);
	}

	const roles = await listRolesForBusiness(businessId);
	const isLegacy =
		roleSlug === "admin" || roleSlug === "manager" || roleSlug === "cashier";
	const isCustom = roles.some((role) => role.slug === roleSlug);

	if (!isLegacy && !isCustom) {
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.VALIDATION,
			"Rol de negocio no válido.",
		);
	}
}

function resolvePinHash(pin?: string) {
	if (!pin) {
		return null;
	}
	return hashPassword(pin);
}

export async function loadEmployeesForBusiness() {
	await requireBusinessPermission("employees.view");
	const { businessId } = await requireStaffBusinessContext();
	return await listEmployeesForBusiness(businessId);
}

export async function createEmployeeForBusiness(data: CreateEmployeeInput) {
	await requireBusinessPermission("employees.create");
	const { businessId } = await requireStaffBusinessContext();

	const email = data.email.trim().toLowerCase();
	await assertAssignableRole(businessId, data.role_slug);

	const duplicate = await findMembershipByEmailForBusiness({
		businessId,
		email,
	});
	if (duplicate) {
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.DUPLICATE_EMAIL,
			"Ya existe un empleado con ese email en este negocio.",
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
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.VALIDATION,
			"No se pudo crear el usuario.",
		);
	}

	const membershipId = await insertBusinessMember({
		businessId,
		userId,
		roleSlug: data.role_slug,
		status: data.status,
		posPinHash: resolvePinHash(data.pin),
	});

	if (!membershipId) {
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.VALIDATION,
			"No se pudo crear la membresía.",
		);
	}

	return { ok: true as const, membership_id: membershipId };
}

export async function updateEmployeeForBusiness(data: UpdateEmployeeInput) {
	await requireBusinessPermission("employees.edit");
	const { businessId } = await requireStaffBusinessContext();

	const existing = await getEmployeeMembershipForBusiness({
		businessId,
		membershipId: data.membership_id,
	});

	if (!existing) {
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.NOT_FOUND,
			"Empleado no encontrado.",
		);
	}

	if (existing.role_slug === BUSINESS_OWNER_ROLE) {
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.OWNER_PROTECTED,
			"No puedes modificar al propietario del negocio.",
		);
	}

	const email = data.email.trim().toLowerCase();
	if (email !== existing.email.toLowerCase()) {
		const duplicate = await findMembershipByEmailForBusiness({
			businessId,
			email,
		});
		if (duplicate && duplicate.membership_id !== data.membership_id) {
			throw new BusinessStaffError(
				BUSINESS_STAFF_ERRORS.DUPLICATE_EMAIL,
				"Ya existe un empleado con ese email en este negocio.",
			);
		}
	}

	await assertAssignableRole(businessId, data.role_slug);

	await updateUserBasics({
		userId: existing.user_id,
		name: data.name.trim(),
		email,
	});

	await updateBusinessMember({
		membershipId: data.membership_id,
		businessId,
		roleSlug: data.role_slug,
		status: data.status,
		posPinHash: resolvePinHash(data.pin),
		clearPin: Boolean(data.clear_pin),
	});

	return { ok: true as const };
}

export async function listAssignableRolesForBusiness() {
	await requireBusinessPermission("employees.view");
	const { businessId } = await requireStaffBusinessContext();
	const custom = await listRolesForBusiness(businessId);

	return [
		...custom.map((role) => ({
			slug: role.slug,
			name: role.name,
			is_custom: true,
		})),
		{ slug: "admin", name: "Admin (legacy)", is_custom: false },
		{ slug: "manager", name: "Manager (legacy)", is_custom: false },
		{ slug: "cashier", name: "Cajero (legacy)", is_custom: false },
	];
}
