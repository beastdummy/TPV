import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
	resolvePosWarehouseContext,
	savePosTerminalWarehouse,
} from "../inventory/pos-warehouse.server";
import { POS_DEFAULT_TERMINAL_ID } from "./build-pos-sale-payload";
import { loadSalesCatalogForPos } from "./sales-access.server";

/** Catálogo + almacén de venta — tenant-aware (/sales loader). */
export const getSalesCatalogForPosFn = createServerFn({
	method: "GET",
})
	.inputValidator((data: unknown) =>
		z.object({ terminal_id: z.string().trim().optional() }).parse(data ?? {}),
	)
	.handler(async ({ data }) => {
		const terminalId = data.terminal_id?.trim() || POS_DEFAULT_TERMINAL_ID;
		const [catalog, posWarehouse] = await Promise.all([
			loadSalesCatalogForPos(),
			resolvePosWarehouseContext(terminalId),
		]);

		return {
			...catalog,
			operationalWarehouse: {
				id: posWarehouse.id,
				name: posWarehouse.name,
			},
			posWarehouse,
			terminalId,
		};
	});

export const setPosTerminalWarehouseFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) =>
		z
			.object({
				terminal_id: z.string().trim().min(1),
				warehouse_id: z.string().trim().min(1).max(80),
			})
			.parse(data),
	)
	.handler(async ({ data }) => {
		await savePosTerminalWarehouse(data.terminal_id, data.warehouse_id);
		return await resolvePosWarehouseContext(data.terminal_id);
	});
