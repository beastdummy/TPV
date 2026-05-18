import { z } from "zod";

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
