import { requireBusinessRole } from "../auth/tenant-guards.server";
import { POS_OPERATION_ROLES, type Role } from "../auth/types";
import { getSalesCatalog } from "./queries.server";
import type { SalesCatalog } from "./types";

export async function ensurePosOperationBusinessRole() {
	return await requireBusinessRole(POS_OPERATION_ROLES);
}

export type PosBusinessContext = {
	businessId: string;
	userId: string;
	role: Role;
};

/** Negocio activo para operaciones POS (membresía o fallback legacy + default business). */
export async function resolvePosBusinessContext(): Promise<PosBusinessContext> {
	const ctx = await ensurePosOperationBusinessRole();

	if (ctx.business) {
		return {
			businessId: ctx.business.businessId,
			userId: ctx.user.id,
			role: ctx.role,
		};
	}

	const { resolveDefaultBusinessContext } = await import(
		"../tenancy/context.server"
	);
	const business = await resolveDefaultBusinessContext(ctx.user.id);

	if (!business) {
		const { createTenantAuthError, TENANT_AUTH_ERRORS } = await import(
			"../auth/tenant-guards.server"
		);
		throw createTenantAuthError(TENANT_AUTH_ERRORS.TENANT_NOT_FOUND);
	}

	return {
		businessId: business.businessId,
		userId: ctx.user.id,
		role: ctx.role,
	};
}

/** Catálogo activo para TPV — tenant-aware (solo lectura). */
export async function loadSalesCatalogForPos(): Promise<SalesCatalog> {
	await ensurePosOperationBusinessRole();
	return await getSalesCatalog();
}
