import {
	getRecentPurchaseReceipts,
	getSuppliers,
} from "../purchases/queries.server";
import {
	ensureCatalogManagementBusinessRole,
	loadProductsForAdmin,
} from "./products-access.server";
import { loadWarehousesForAdmin } from "./warehouses-access.server";

export async function loadSuppliersForAdmin() {
	await ensureCatalogManagementBusinessRole();
	return await getSuppliers();
}

export async function loadRecentPurchaseReceiptsForAdmin() {
	await ensureCatalogManagementBusinessRole();
	return await getRecentPurchaseReceipts();
}

/** Datos de lectura para /admin/purchases (sin operaciones de escritura). */
export async function loadPurchasesPageForAdmin() {
	const [suppliers, warehouses, products, receipts] = await Promise.all([
		loadSuppliersForAdmin(),
		loadWarehousesForAdmin(),
		loadProductsForAdmin(),
		loadRecentPurchaseReceiptsForAdmin(),
	]);

	return { suppliers, warehouses, products, receipts };
}
