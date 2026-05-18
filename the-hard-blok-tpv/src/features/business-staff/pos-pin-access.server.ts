import { hashPassword } from "../auth/password.server";
import { BUSINESS_OWNER_ROLE } from "../tenancy/business-roles.types";
import { BUSINESS_STAFF_ERRORS, BusinessStaffError } from "./errors";
import { verifyBusinessMemberPin } from "./pos-pin.server";
import {
	getEmployeeMembershipForBusiness,
	getMembershipByUserIdForBusiness,
	updateMemberPosPinOnly,
} from "./queries.server";
import { requireStaffBusinessContext } from "./tenant-context.server";

export async function getMyPosPinStatusForBusiness() {
	const { businessId, userId, actorRole } = await requireStaffBusinessContext();

	const membership = await getMembershipByUserIdForBusiness({
		businessId,
		userId,
	});

	if (!membership) {
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.NOT_FOUND,
			"No se encontró tu membresía en este negocio.",
		);
	}

	return {
		membership_id: membership.membership_id,
		has_pin: membership.has_pin,
		role_slug: membership.role_slug,
		is_owner: membership.role_slug === BUSINESS_OWNER_ROLE,
		actor_role: actorRole,
	};
}

export async function setMyPosPinForBusiness(pin: string) {
	const trimmed = pin.trim();
	if (!/^\d{4,8}$/.test(trimmed)) {
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.VALIDATION,
			"El PIN debe tener entre 4 y 8 dígitos.",
		);
	}

	const { businessId, userId } = await requireStaffBusinessContext();

	const membership = await getMembershipByUserIdForBusiness({
		businessId,
		userId,
	});

	if (!membership) {
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.NOT_FOUND,
			"No se encontró tu membresía en este negocio.",
		);
	}

	await updateMemberPosPinOnly({
		businessId,
		membershipId: membership.membership_id,
		posPinHash: hashPassword(trimmed),
	});

	return { ok: true as const };
}

export async function verifyMyPosPinForBusiness(pin: string) {
	const { businessId, userId } = await requireStaffBusinessContext();

	const membership = await getMembershipByUserIdForBusiness({
		businessId,
		userId,
	});

	if (!membership) {
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.NOT_FOUND,
			"No se encontró tu membresía en este negocio.",
		);
	}

	const valid = await verifyBusinessMemberPin(
		businessId,
		membership.membership_id,
		pin,
	);

	if (!valid) {
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.VALIDATION,
			"PIN incorrecto.",
		);
	}

	return { ok: true as const };
}

export async function setEmployeePosPinForBusiness(
	membershipId: string,
	pin: string,
) {
	const trimmed = pin.trim();
	if (!/^\d{4,8}$/.test(trimmed)) {
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.VALIDATION,
			"El PIN debe tener entre 4 y 8 dígitos.",
		);
	}

	const { requireBusinessPermission } = await import(
		"./business-permissions.server"
	);
	await requireBusinessPermission("employees.edit");

	const { businessId, userId } = await requireStaffBusinessContext();

	const target = await getEmployeeMembershipForBusiness({
		businessId,
		membershipId,
	});

	if (!target) {
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.NOT_FOUND,
			"Empleado no encontrado.",
		);
	}

	const actor = await getMembershipByUserIdForBusiness({ businessId, userId });

	if (target.role_slug === BUSINESS_OWNER_ROLE) {
		if (!actor || actor.role_slug !== BUSINESS_OWNER_ROLE) {
			throw new BusinessStaffError(
				BUSINESS_STAFF_ERRORS.OWNER_PROTECTED,
				"No puedes cambiar el PIN del propietario.",
			);
		}
		if (target.membership_id !== actor.membership_id) {
			throw new BusinessStaffError(
				BUSINESS_STAFF_ERRORS.OWNER_PROTECTED,
				"Solo el propietario puede cambiar su propio PIN.",
			);
		}
	}

	await updateMemberPosPinOnly({
		businessId,
		membershipId,
		posPinHash: hashPassword(trimmed),
	});

	return { ok: true as const };
}
