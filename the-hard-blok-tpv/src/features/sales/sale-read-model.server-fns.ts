import { createServerFn } from "@tanstack/react-start";

import {
	listRecentSalesSchema,
	saleReceiptByIdSchema,
	saleReceiptByReceiptNumberSchema,
} from "./sale-read-model.schemas";

export type {
	ListRecentSalesInput,
	SaleReceiptByIdInput,
	SaleReceiptByReceiptNumberInput,
} from "./sale-read-model.schemas";
export {
	listRecentSalesSchema,
	saleReceiptByIdSchema,
	saleReceiptByReceiptNumberSchema,
} from "./sale-read-model.schemas";

/** Ticket completo por `sale_id` — tenant-aware. */
export const getSaleReceiptByIdForPosFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => saleReceiptByIdSchema.parse(data))
	.handler(async ({ data }) => {
		const { handleGetSaleReceiptByIdForPos } = await import(
			"./sale-read-model.handlers.server"
		);
		return await handleGetSaleReceiptByIdForPos(data);
	});

/** Ticket completo por `receipt_number` — tenant-aware. */
export const getSaleReceiptByReceiptNumberForPosFn = createServerFn({
	method: "POST",
})
	.inputValidator((data: unknown) =>
		saleReceiptByReceiptNumberSchema.parse(data),
	)
	.handler(async ({ data }) => {
		const { handleGetSaleReceiptByReceiptNumberForPos } = await import(
			"./sale-read-model.handlers.server"
		);
		return await handleGetSaleReceiptByReceiptNumberForPos(data);
	});

/** Ventas recientes (resumen) — tenant-aware. */
export const listRecentSalesForPosFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => listRecentSalesSchema.parse(data ?? {}))
	.handler(async ({ data }) => {
		const { handleListRecentSalesForPos } = await import(
			"./sale-read-model.handlers.server"
		);
		return await handleListRecentSalesForPos(data);
	});
