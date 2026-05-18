import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { WarehouseForAdminInput } from "./warehouses-access.server";
import {
	createWarehouseForAdmin,
	loadWarehousesForAdmin,
} from "./warehouses-access.server";

const warehouseSchema = z.object({
	id: z.string().trim().min(1).max(80),
	name: z.string().trim().min(1).max(120),
	is_active: z.boolean(),
});

/** Listado de almacenes — tenant-aware (ruta /admin/warehouses). */
export const getWarehousesForAdminFn = createServerFn({
	method: "GET",
}).handler(async () => {
	return await loadWarehousesForAdmin();
});

/** Crear almacén — tenant-aware. */
export const createWarehouseForAdminFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => warehouseSchema.parse(data))
	.handler(async ({ data }) => {
		return await createWarehouseForAdmin(data as WarehouseForAdminInput);
	});
