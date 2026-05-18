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
	const { getProductStockOverview, getAllStockMovements } = await import(
		"../inventory/queries.server"
	);

	const [warehouses, products, inventoryRows, stockRows, stockMovements] =
		await Promise.all([
			loadWarehousesForAdmin(),
			loadProductsForAdmin(),
			loadInventoryItemsForAdmin(),
			getProductStockOverview(),
			getAllStockMovements(80),
		]);

	return { warehouses, products, inventoryRows, stockRows, stockMovements };
}

export async function loadReplenishmentPageForAdmin(warehouseId?: string) {
	await ensureCatalogManagementBusinessRole();
	const { getReplenishmentListForAdmin } = await import(
		"../inventory/replenishment.server"
	);
	const warehouses = await loadWarehousesForAdmin();
	const rows = await getReplenishmentListForAdmin(warehouseId);

	return { warehouses, rows, warehouseId: warehouseId ?? null };
}
