import { createServerFn } from "@tanstack/react-start";

import {
	loadPurchasesPageForAdmin,
	loadRecentPurchaseReceiptsForAdmin,
	loadSuppliersForAdmin,
} from "./purchases-access.server";

/** Proveedores activos — tenant-aware (solo lectura). */
export const getSuppliersForAdminFn = createServerFn({
	method: "GET",
}).handler(async () => {
	return await loadSuppliersForAdmin();
});

/** Recepciones recientes — tenant-aware (solo lectura). */
export const getRecentPurchaseReceiptsForAdminFn = createServerFn({
	method: "GET",
}).handler(async () => {
	return await loadRecentPurchaseReceiptsForAdmin();
});

/** Loader de /admin/purchases — tenant-aware (suppliers + warehouses + products + receipts). */
export const getPurchasesPageForAdminFn = createServerFn({
	method: "GET",
}).handler(async () => {
	return await loadPurchasesPageForAdmin();
});
