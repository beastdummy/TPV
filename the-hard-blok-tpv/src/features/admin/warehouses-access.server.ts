import type { Warehouse } from "../inventory/types";
import { ensureCatalogManagementBusinessRole } from "./products-access.server";

export type WarehouseForAdminInput = Warehouse;

export async function loadWarehousesForAdmin() {
	await ensureCatalogManagementBusinessRole();
	const { getWarehouses } = await import("../inventory/queries.server");
	return await getWarehouses();
}

export async function createWarehouseForAdmin(data: WarehouseForAdminInput) {
	await ensureCatalogManagementBusinessRole();
	const { createWarehouse } = await import("../inventory/queries.server");
	await createWarehouse(data);
	return { ok: true as const };
}
