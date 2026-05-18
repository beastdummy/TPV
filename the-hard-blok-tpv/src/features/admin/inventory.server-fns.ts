import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	LEGACY_STOCK_MOVEMENT_TYPES,
	STOCK_ADJUSTMENT_REASON_CODES,
} from "../inventory/stock-movement-types";
import {
	loadInventoryItemsForAdmin,
	loadInventoryPageForAdmin,
	loadReplenishmentPageForAdmin,
} from "./inventory-access.server";
import type {
	AdjustStockForAdminRpcInput,
	CreateInventoryMovementDetailedForAdminInput,
	CreateStockMovementForAdminInput,
	SetProductStockForAdminInput,
	TransferStockForAdminInput,
} from "./inventory-write-access.server";
import {
	adjustStockForAdmin,
	createInventoryMovementDetailedForAdmin,
	createStockMovementForAdmin,
	setProductStockForAdmin,
	transferStockBetweenWarehousesForAdmin,
	updateProductStockMinimumsForAdmin,
} from "./inventory-write-access.server";

const setStockSchema = z.object({
	product_id: z.string().trim().min(1),
	warehouse_id: z.string().trim().min(1).max(80),
	quantity: z.number().min(0),
});

const createMovementSchema = z.object({
	product_id: z.string().trim().min(1),
	warehouse_id: z.string().trim().min(1).max(80),
	movement_type: z.enum(LEGACY_STOCK_MOVEMENT_TYPES),
	quantity: z.number().positive(),
	reason: z.string().trim().max(300),
});

const createDetailedMovementSchema = z.object({
	product_id: z.string().trim().min(1),
	warehouse_id: z.string().trim().min(1).max(80),
	movement_type: z.enum(LEGACY_STOCK_MOVEMENT_TYPES),
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

const transferStockSchema = z.object({
	product_id: z.string().trim().min(1),
	from_warehouse_id: z.string().trim().min(1).max(80),
	to_warehouse_id: z.string().trim().min(1).max(80),
	quantity: z.number().positive(),
	reason_code: z.string().trim().min(1).max(120),
	note: z.string().trim().max(500).optional(),
});

const adjustStockSchema = z.object({
	product_id: z.string().trim().min(1),
	warehouse_id: z.string().trim().min(1).max(80),
	adjustment_type: z.enum(["increase", "decrease", "set"]),
	quantity: z.number(),
	reason_code: z.enum(STOCK_ADJUSTMENT_REASON_CODES),
	note: z.string().trim().max(500).optional(),
	confirm_negative: z.boolean().optional(),
});

const minimumStockSchema = z.object({
	product_id: z.string().trim().min(1),
	warehouse_id: z.string().trim().min(1).max(80),
	minimum_quantity: z.number().min(0),
	reorder_quantity: z.number().min(0),
});

export const getReplenishmentPageForAdminFn = createServerFn({
	method: "GET",
}).handler(async () => await loadReplenishmentPageForAdmin());

export const transferStockBetweenWarehousesForAdminFn = createServerFn({
	method: "POST",
})
	.inputValidator((data: unknown) => transferStockSchema.parse(data))
	.handler(async ({ data }) => {
		return await transferStockBetweenWarehousesForAdmin(
			data as TransferStockForAdminInput,
		);
	});

export const adjustStockForAdminFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => adjustStockSchema.parse(data))
	.handler(async ({ data }) => {
		return await adjustStockForAdmin(data as AdjustStockForAdminRpcInput);
	});

export const updateProductStockMinimumsForAdminFn = createServerFn({
	method: "POST",
})
	.inputValidator((data: unknown) => minimumStockSchema.parse(data))
	.handler(async ({ data }) => {
		return await updateProductStockMinimumsForAdmin(data);
	});
