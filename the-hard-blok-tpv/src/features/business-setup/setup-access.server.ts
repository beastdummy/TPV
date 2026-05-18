import { getCurrentTenantContext } from "../auth/tenant-guards.server";
import { isBusinessOwnerRole } from "../business-staff/permissions";
import {
	getBusinessDetailsForSetup,
	updateBusinessForSetup,
} from "../tenancy/queries.server";
import { logBusinessAuditEvent } from "./audit.server";
import { markBusinessSetupCompleted } from "./setup-queries.server";
import { getBusinessSetupState } from "./setup-state.server";
import { BUSINESS_AUDIT_ACTIONS } from "./types";

async function requireOwnerBusinessContext() {
	const ctx = await getCurrentTenantContext();

	if (!ctx?.business) {
		throw new Error("TENANT_NOT_FOUND");
	}

	if (!isBusinessOwnerRole(ctx.role)) {
		throw new Error("FORBIDDEN");
	}

	return {
		businessId: ctx.business.businessId,
		userId: ctx.user.id,
		membershipId: ctx.business.membershipId,
	};
}

export async function loadSetupWizardContext() {
	const { businessId } = await requireOwnerBusinessContext();
	const [business, setup] = await Promise.all([
		getBusinessDetailsForSetup(businessId),
		getBusinessSetupState(businessId),
	]);

	if (!business) {
		throw new Error("TENANT_NOT_FOUND");
	}

	return { business, setup };
}

export type ConfirmBusinessSetupInput = {
	name: string;
	legal_name?: string;
	timezone?: string;
};

export async function confirmBusinessSetupDetails(
	input: ConfirmBusinessSetupInput,
) {
	const { businessId, userId } = await requireOwnerBusinessContext();

	await updateBusinessForSetup({
		businessId,
		name: input.name.trim(),
		legalName: input.legal_name?.trim() ?? "",
		timezone: input.timezone?.trim() || "Europe/Madrid",
	});

	await logBusinessAuditEvent({
		businessId,
		actorUserId: userId,
		action: BUSINESS_AUDIT_ACTIONS.BUSINESS_CREATED,
		entityType: "business",
		entityId: businessId,
		metadata: { name: input.name.trim() },
	});

	return { ok: true as const };
}

export async function finishBusinessSetup() {
	const { businessId, userId } = await requireOwnerBusinessContext();
	const setup = await getBusinessSetupState(businessId);

	if (!setup.canAccessSales) {
		throw new Error("SETUP_INCOMPLETE");
	}

	await markBusinessSetupCompleted(businessId);

	await logBusinessAuditEvent({
		businessId,
		actorUserId: userId,
		action: BUSINESS_AUDIT_ACTIONS.SETUP_COMPLETED,
		entityType: "business",
		entityId: businessId,
	});

	return { ok: true as const, redirectTo: "/sales" as const };
}

export async function getBusinessSetupStateForCurrentTenant() {
	const ctx = await getCurrentTenantContext();

	if (!ctx?.business) {
		return null;
	}

	return await getBusinessSetupState(ctx.business.businessId);
}
