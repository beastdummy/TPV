import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { SALE_PAYMENT_METHODS } from "./transaction/types";

const saleLineSchema = z.object({
	product_id: z.string().trim().uuid(),
	product_name: z.string().trim().min(1).max(200),
	quantity: z.number().positive(),
	unit_price: z.number().min(0),
	discount_percent: z.number().min(0).max(100),
	tax_rate: z.number().min(0).optional(),
});

const finalizeSaleSchema = z.object({
	client_request_id: z.string().trim().min(1).max(120),
	cash_session_id: z.string().trim().uuid(),
	terminal_id: z.string().trim().min(1).max(80).optional(),
	warehouse_id: z.string().trim().min(1).max(80),
	payment_method: z.enum(SALE_PAYMENT_METHODS),
	lines: z.array(saleLineSchema).min(1),
	notes: z.string().trim().max(500).optional(),
	operator_token: z.string().trim().min(1),
});

/** Finaliza venta — transaccional e idempotente (Fase C1, sin stock ni pagos). */
export const finalizeSaleForPosFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => finalizeSaleSchema.parse(data))
	.handler(async ({ data }) => {
		const { finalizeSale } = await import("./finalize-sale-access.server");
		return await finalizeSale(data);
	});
