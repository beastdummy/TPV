import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { STOCK_MOVEMENT_TYPES } from "../inventory/types";
import {
	loadInventoryItemsForAdmin,
	loadInventoryPageForAdmin,
} from "./inventory-access.server";
import type {
	CreateInventoryMovementDetailedForAdminInput,
	CreateStockMovementForAdminInput,
	SetProductStockForAdminInput,
} from "./inventory-write-access.server";
import {
	createInventoryMovementDetailedForAdmin,
	createStockMovementForAdmin,
	setProductStockForAdmin,
} from "./inventory-write-access.server";

const setStockSchema = z.object({
	product_id: z.string().trim().min(1),
	warehouse_id: z.string().trim().min(1).max(80),
	quantity: z.number().min(0),
});

const createMovementSchema = z.object({
	product_id: z.string().trim().min(1),
	warehouse_id: z.string().trim().min(1).max(80),
	movement_type: z.enum(STOCK_MOVEMENT_TYPES),
	quantity: z.number().positive(),
	reason: z.string().trim().max(300),
});

const createDetailedMovementSchema = z.object({
	product_id: z.string().trim().min(1),
	warehouse_id: z.string().trim().min(1).max(80),
	movement_type: z.enum(STOCK_MOVEMENT_TYPES),
	quantity: z.number().positive(),
	lot_code: z.string().trim().max(120),
	serial_number: z.string().trim().max(120),
	expiry_date: z
		.string()
		.trim()
		.optional()
		.transform((value) => (value ? value : null)),
	reason: z.string().trim().max(300),
});

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

/** Ajuste directo de stock — tenant-aware. */
export const setProductStockForAdminFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => setStockSchema.parse(data))
	.handler(async ({ data }) => {
		return await setProductStockForAdmin(data as SetProductStockForAdminInput);
	});

/** Movimiento simple de stock — tenant-aware. */
export const createStockMovementForAdminFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => createMovementSchema.parse(data))
	.handler(async ({ data }) => {
		return await createStockMovementForAdmin(
			data as CreateStockMovementForAdminInput,
		);
	});

/** Movimiento detallado (lote/serie/caducidad) — tenant-aware (/admin/inventory). */
export const createInventoryMovementDetailedForAdminFn = createServerFn({
	method: "POST",
})
	.inputValidator((data: unknown) => createDetailedMovementSchema.parse(data))
	.handler(async ({ data }) => {
		return await createInventoryMovementDetailedForAdmin(
			data as CreateInventoryMovementDetailedForAdminInput,
		);
	});
