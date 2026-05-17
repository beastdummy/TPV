import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
	getSaleReceiptByIdForPos,
	getSaleReceiptByReceiptNumberForPos,
	listRecentSalesForPos,
} from "./sale-read-model.server";

export const saleReceiptByIdSchema = z.object({
	sale_id: z.string().trim().uuid(),
});

export const saleReceiptByReceiptNumberSchema = z.object({
	receipt_number: z.number().int().positive(),
});

export const listRecentSalesSchema = z.object({
	limit: z.number().int().min(1).max(100).optional(),
	terminal_id: z.string().trim().min(1).max(80).optional(),
});

export type SaleReceiptByIdInput = z.infer<typeof saleReceiptByIdSchema>;
export type SaleReceiptByReceiptNumberInput = z.infer<
	typeof saleReceiptByReceiptNumberSchema
>;
export type ListRecentSalesInput = z.infer<typeof listRecentSalesSchema>;

export async function handleGetSaleReceiptByIdForPos(
	input: SaleReceiptByIdInput,
) {
	return await getSaleReceiptByIdForPos(input.sale_id);
}

export async function handleGetSaleReceiptByReceiptNumberForPos(
	input: SaleReceiptByReceiptNumberInput,
) {
	return await getSaleReceiptByReceiptNumberForPos(input.receipt_number);
}

export async function handleListRecentSalesForPos(input: ListRecentSalesInput) {
	return await listRecentSalesForPos(input);
}

/** Ticket completo por `sale_id` — tenant-aware. */
export const getSaleReceiptByIdForPosFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => saleReceiptByIdSchema.parse(data))
	.handler(async ({ data }) => handleGetSaleReceiptByIdForPos(data));

/** Ticket completo por `receipt_number` — tenant-aware. */
export const getSaleReceiptByReceiptNumberForPosFn = createServerFn({
	method: "POST",
})
	.inputValidator((data: unknown) =>
		saleReceiptByReceiptNumberSchema.parse(data),
	)
	.handler(async ({ data }) => handleGetSaleReceiptByReceiptNumberForPos(data));

/** Ventas recientes (resumen) — tenant-aware. */
export const listRecentSalesForPosFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => listRecentSalesSchema.parse(data ?? {}))
	.handler(async ({ data }) => handleListRecentSalesForPos(data));
