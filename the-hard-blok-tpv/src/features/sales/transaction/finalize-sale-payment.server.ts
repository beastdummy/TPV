import type { PoolClient } from "pg";

import { insertSalePayment } from "../sale-payment-queries.server";
import { SALES_TX_ERROR_CODES, SalesTransactionError } from "./errors";
import type { SalePaymentRow } from "./schema-types";
import type {
	FinalizeSalePaymentSnapshot,
	SalePaymentMethod,
	SalePaymentStatus,
} from "./types";
import { DEFAULT_SALE_PAYMENT_CURRENCY, SALE_PAYMENT_PROVIDERS } from "./types";

const INTERNAL_PROVIDER = SALE_PAYMENT_PROVIDERS[0];

export function resolveInternalPaymentStatus(
	paymentMethod: SalePaymentMethod,
): SalePaymentStatus {
	switch (paymentMethod) {
		case "cash":
			return "completed";
		case "card":
			return "pending";
		case "mixed":
			throw new SalesTransactionError(
				SALES_TX_ERROR_CODES.VALIDATION,
				"El pago mixto no está disponible todavía.",
			);
		default: {
			const exhaustive: never = paymentMethod;
			return exhaustive;
		}
	}
}

export function mapSalePaymentToSnapshot(
	payment: SalePaymentRow,
): FinalizeSalePaymentSnapshot {
	return {
		payment_id: payment.id,
		payment_method: payment.payment_method,
		amount: payment.amount,
		currency: payment.currency,
		status: payment.status,
		provider: payment.provider,
	};
}

/**
 * Persiste snapshot interno en `sale_payments` (sin pasarela externa).
 * Efectivo → completed; tarjeta → pending (solo registro).
 */
export async function insertInternalSalePaymentSnapshot(
	client: PoolClient,
	input: {
		sale_id: string;
		business_id: string;
		payment_method: SalePaymentMethod;
		amount: number;
		currency?: string;
	},
): Promise<SalePaymentRow> {
	if (input.amount < 0) {
		throw new SalesTransactionError(
			SALES_TX_ERROR_CODES.VALIDATION,
			"El importe del pago no puede ser negativo.",
		);
	}

	const status = resolveInternalPaymentStatus(input.payment_method);
	const currency = input.currency ?? DEFAULT_SALE_PAYMENT_CURRENCY;
	const processedAt = status === "completed" ? new Date().toISOString() : null;

	return await insertSalePayment(
		{
			sale_id: input.sale_id,
			business_id: input.business_id,
			payment_method: input.payment_method,
			amount: input.amount,
			currency,
			status,
			provider: INTERNAL_PROVIDER,
			provider_reference: null,
			processed_at: processedAt,
		},
		client,
	);
}
