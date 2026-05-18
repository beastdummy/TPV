import { hasPermissionForBusinessRole } from "../business-staff/permission-for-role.server";
import { verifyBusinessMemberPin } from "../business-staff/pos-pin.server";
import {
	getEmployeeMembershipForBusiness,
	listActiveMembersWithPinForBusiness,
} from "../business-staff/queries.server";
import {
	SALES_TX_ERROR_CODES,
	SalesTransactionError,
} from "../sales/transaction/errors";
import {
	assertPosPinRateLimitAllowed,
	clearPosPinRateLimit,
	recordPosPinFailure,
} from "./rate-limit.server";

export type VerifiedPosOperator = {
	membership_id: string;
	user_id: string;
	role_slug: string;
	display_name: string;
};

function pinInvalidError(message = "PIN incorrecto.") {
	return new SalesTransactionError(
		SALES_TX_ERROR_CODES.POS_PIN_INVALID,
		message,
	);
}

export async function verifyPosPinForTerminal(input: {
	businessId: string;
	terminalId: string;
	pin: string;
	email?: string;
}): Promise<VerifiedPosOperator> {
	const pin = input.pin.trim();
	if (!/^\d{4,8}$/.test(pin)) {
		throw new SalesTransactionError(
			SALES_TX_ERROR_CODES.VALIDATION,
			"El PIN debe tener entre 4 y 8 dígitos.",
		);
	}

	try {
		assertPosPinRateLimitAllowed(input.businessId, input.terminalId);
	} catch {
		throw pinInvalidError("Demasiados intentos. Espera un momento.");
	}

	const email = input.email?.trim().toLowerCase();

	if (email) {
		const member = await resolveMemberByEmailAndPin(
			input.businessId,
			input.terminalId,
			email,
			pin,
		);
		clearPosPinRateLimit(input.businessId, input.terminalId);
		return member;
	}

	const members = await listActiveMembersWithPinForBusiness(input.businessId);
	const matches: VerifiedPosOperator[] = [];

	for (const member of members) {
		const valid = await verifyBusinessMemberPin(
			input.businessId,
			member.membership_id,
			pin,
		);
		if (!valid) {
			continue;
		}

		const canSell = await hasPermissionForBusinessRole(
			input.businessId,
			member.role_slug,
			"sales.view",
		);
		if (!canSell) {
			continue;
		}

		matches.push({
			membership_id: member.membership_id,
			user_id: member.user_id,
			role_slug: member.role_slug,
			display_name: member.name,
		});
	}

	if (matches.length === 0) {
		recordPosPinFailure(input.businessId, input.terminalId);
		throw pinInvalidError();
	}

	if (matches.length > 1) {
		recordPosPinFailure(input.businessId, input.terminalId);
		throw new SalesTransactionError(
			SALES_TX_ERROR_CODES.POS_PIN_AMBIGUOUS,
			"PIN duplicado. Indica tu email para identificarte.",
		);
	}

	clearPosPinRateLimit(input.businessId, input.terminalId);
	return matches[0] as VerifiedPosOperator;
}

async function resolveMemberByEmailAndPin(
	businessId: string,
	terminalId: string,
	email: string,
	pin: string,
): Promise<VerifiedPosOperator> {
	const members = await listActiveMembersWithPinForBusiness(businessId);
	const match = members.find((m) => m.email.toLowerCase() === email);

	if (!match) {
		recordPosPinFailure(businessId, terminalId);
		throw pinInvalidError();
	}

	const membership = await getEmployeeMembershipForBusiness({
		businessId,
		membershipId: match.membership_id,
	});

	if (!membership || membership.status !== "active") {
		recordPosPinFailure(businessId, terminalId);
		throw pinInvalidError();
	}

	const valid = await verifyBusinessMemberPin(businessId, email, pin);
	if (!valid) {
		recordPosPinFailure(businessId, terminalId);
		throw pinInvalidError();
	}

	const canSell = await hasPermissionForBusinessRole(
		businessId,
		match.role_slug,
		"sales.view",
	);
	if (!canSell) {
		throw new SalesTransactionError(
			SALES_TX_ERROR_CODES.FORBIDDEN,
			"Este empleado no puede operar el TPV.",
		);
	}

	return {
		membership_id: match.membership_id,
		user_id: match.user_id,
		role_slug: match.role_slug,
		display_name: match.name,
	};
}
