import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
	loadPurchasesPageForAdmin,
	loadRecentPurchaseReceiptsForAdmin,
	loadSuppliersForAdmin,
} from "./purchases-access.server";
import type {
	CreatePurchaseReceiptForAdminInput,
	CreateSupplierForAdminInput,
} from "./purchases-write-access.server";
import {
	createPurchaseReceiptForAdmin,
	createSupplierForAdmin,
} from "./purchases-write-access.server";

const supplierSchema = z.object({
	name: z.string().trim().min(1).max(140),
	tax_id: z.string().trim().max(80),
	email: z.string().trim().max(140),
	phone: z.string().trim().max(80),
});

const purchaseReceiptSchema = z.object({
	supplier_id: z.string().trim().min(1),
	warehouse_id: z.string().trim().min(1).max(80),
	product_id: z.string().trim().min(1),
	quantity: z.number().positive(),
	unit_cost: z.number().min(0),
	notes: z.string().trim().max(500),
});

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

/** Crear proveedor — tenant-aware (/admin/purchases). */
export const createSupplierForAdminFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => supplierSchema.parse(data))
	.handler(async ({ data }) => {
		return await createSupplierForAdmin(data as CreateSupplierForAdminInput);
	});

/** Registrar albarán de compra — tenant-aware (/admin/purchases). */
export const createPurchaseReceiptForAdminFn = createServerFn({
	method: "POST",
})
	.inputValidator((data: unknown) => purchaseReceiptSchema.parse(data))
	.handler(async ({ data }) => {
		return await createPurchaseReceiptForAdmin(
			data as CreatePurchaseReceiptForAdminInput,
		);
	});
