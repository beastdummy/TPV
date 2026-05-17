import { requireBusinessRole } from "../auth/tenant-guards.server";
import { POS_OPERATION_ROLES } from "../auth/types";
import { getSalesCatalog } from "./queries.server";
import type { SalesCatalog } from "./types";

export async function ensurePosOperationBusinessRole() {
	return await requireBusinessRole(POS_OPERATION_ROLES);
}

/** Catálogo activo para TPV — tenant-aware (solo lectura). */
export async function loadSalesCatalogForPos(): Promise<SalesCatalog> {
	await ensurePosOperationBusinessRole();
	return await getSalesCatalog();
}
