import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { ensureCatalogManagementRole, getAppUserFn } from "../auth/auth.rpc";
import {
	createInventoryMovementDetailed,
	createStockMovement,
	createWarehouse,
	getInventoryItems,
	getWarehouseMovements,
	getWarehouses,
	getWarehouseStock,
	setProductStock,
} from "./queries.server";
import { STOCK_MOVEMENT_TYPES } from "./types";

const warehouseSchema = z.object({
	id: z.string().trim().min(1).max(80),
	name: z.string().trim().min(1).max(120),
	is_active: z.boolean(),
});

const warehouseIdSchema = z.object({
	warehouse_id: z.string().trim().min(1).max(80),
});

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

export const getWarehousesFn = createServerFn({ method: "GET" }).handler(
	async () => {
		await ensureCatalogManagementRole();
		return await getWarehouses();
	},
);

export const createWarehouseFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => warehouseSchema.parse(data))
	.handler(async ({ data }) => {
		await ensureCatalogManagementRole();
		await createWarehouse(data);
		return { ok: true };
	});

export const getWarehouseStockFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => warehouseIdSchema.parse(data))
	.handler(async ({ data }) => {
		await ensureCatalogManagementRole();
		return await getWarehouseStock(data.warehouse_id);
	});

export const setProductStockFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => setStockSchema.parse(data))
	.handler(async ({ data }) => {
		await ensureCatalogManagementRole();
		await setProductStock(data);
		return { ok: true };
	});

export const createStockMovementFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => createMovementSchema.parse(data))
	.handler(async ({ data }) => {
		await ensureCatalogManagementRole();
		const user = await getAppUserFn();
		if (!user) {
			throw new Error("UNAUTHORIZED");
		}

		await createStockMovement({
			...data,
			performed_by_user_id: user.id,
		});
		return { ok: true };
	});

export const getWarehouseMovementsFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => warehouseIdSchema.parse(data))
	.handler(async ({ data }) => {
		await ensureCatalogManagementRole();
		return await getWarehouseMovements(data.warehouse_id);
	});

export const getInventoryItemsFn = createServerFn({ method: "GET" }).handler(
	async () => {
		await ensureCatalogManagementRole();
		return await getInventoryItems();
	},
);

export const createInventoryMovementDetailedFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => createDetailedMovementSchema.parse(data))
	.handler(async ({ data }) => {
		await ensureCatalogManagementRole();
		const user = await getAppUserFn();
		if (!user) {
			throw new Error("UNAUTHORIZED");
		}

		await createInventoryMovementDetailed({
			...data,
			performed_by_user_id: user.id,
		});
		return { ok: true };
	});
