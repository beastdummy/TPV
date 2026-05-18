import { requireTenantContext } from "../auth/tenant-guards.server";
import { BUSINESS_STAFF_ERRORS, BusinessStaffError } from "./errors";

export async function requireStaffBusinessContext() {
	const ctx = await requireTenantContext();

	return {
		businessId: ctx.business.businessId,
		businessSlug: ctx.business.businessSlug,
		actorRole: ctx.role,
		userId: ctx.user.id,
	};
}

export function assertBusinessScope(
	recordBusinessId: string,
	expectedBusinessId: string,
) {
	if (recordBusinessId !== expectedBusinessId) {
		throw new BusinessStaffError(
			BUSINESS_STAFF_ERRORS.FORBIDDEN,
			"Recurso de otro negocio.",
		);
	}
}
