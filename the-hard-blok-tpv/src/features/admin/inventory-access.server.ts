import {
	ensureCatalogManagementBusinessRole,
	loadProductsForAdmin,
} from "./products-access.server";
import { loadWarehousesForAdmin } from "./warehouses-access.server";

export async function loadInventoryItemsForAdmin() {
	await ensureCatalogManagementBusinessRole();
	const { getInventoryItems } = await import("../inventory/queries.server");
	return await getInventoryItems();
}

/** Datos de lectura para /admin/inventory (sin operaciones de escritura). */
export async function loadInventoryPageForAdmin() {
	const [warehouses, products, inventoryRows] = await Promise.all([
		loadWarehousesForAdmin(),
		loadProductsForAdmin(),
		loadInventoryItemsForAdmin(),
	]);

	return { warehouses, products, inventoryRows };
}
