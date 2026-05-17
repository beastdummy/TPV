import { createServerFn } from "@tanstack/react-start";

import {
	loadInventoryItemsForAdmin,
	loadInventoryPageForAdmin,
} from "./inventory-access.server";

/** Filas de inventario detallado — tenant-aware (solo lectura). */
export const getInventoryItemsForAdminFn = createServerFn({
	method: "GET",
}).handler(async () => {
	return await loadInventoryItemsForAdmin();
});

/** Loader de /admin/inventory — tenant-aware (warehouses + products + inventory read). */
export const getInventoryPageForAdminFn = createServerFn({
	method: "GET",
}).handler(async () => {
	return await loadInventoryPageForAdmin();
});
