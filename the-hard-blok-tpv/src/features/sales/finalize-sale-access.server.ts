import { requireOpenCashSessionForPos } from "./cash-session-access.server";
import { resolvePosBusinessContext } from "./sales-access.server";
import {
	SALES_TX_ERROR_CODES,
	SalesTransactionError,
} from "./transaction/errors";
import { executeFinalizeSaleCommand } from "./transaction/finalize-sale-command.server";
import { computeSaleLine } from "./transaction/finalize-sale-totals";
import { buildSaleIdempotencyKey } from "./transaction/idempotency";
import type {
	FinalizeSaleInput,
	FinalizeSaleResult,
} from "./transaction/types";

function validateFinalizeSaleInput(input: FinalizeSaleInput): void {
	const clientRequestId = input.client_request_id?.trim();
	if (!clientRequestId) {
		throw new SalesTransactionError(
			SALES_TX_ERROR_CODES.VALIDATION,
			"client_request_id es obligatorio.",
		);
	}

	if (!input.cash_session_id?.trim()) {
		throw new SalesTransactionError(
			SALES_TX_ERROR_CODES.VALIDATION,
			"cash_session_id es obligatorio.",
		);
	}

	if (!input.warehouse_id?.trim()) {
		throw new SalesTransactionError(
			SALES_TX_ERROR_CODES.VALIDATION,
			"warehouse_id es obligatorio.",
		);
	}

	if (!input.lines?.length) {
		throw new SalesTransactionError(
			SALES_TX_ERROR_CODES.VALIDATION,
			"La venta debe incluir al menos una línea.",
		);
	}

	for (const line of input.lines) {
		if (!line.product_id?.trim() || !line.product_name?.trim()) {
			throw new SalesTransactionError(
				SALES_TX_ERROR_CODES.VALIDATION,
				"Cada línea debe incluir producto.",
			);
		}

		if (line.quantity <= 0) {
			throw new SalesTransactionError(
				SALES_TX_ERROR_CODES.VALIDATION,
				"La cantidad debe ser mayor que cero.",
			);
		}

		if (line.unit_price < 0) {
			throw new SalesTransactionError(
				SALES_TX_ERROR_CODES.VALIDATION,
				"El precio unitario no puede ser negativo.",
			);
		}

		if (line.discount_percent < 0 || line.discount_percent > 100) {
			throw new SalesTransactionError(
				SALES_TX_ERROR_CODES.VALIDATION,
				"El descuento debe estar entre 0 y 100.",
			);
		}

		const taxRate = line.tax_rate ?? 0;
		if (taxRate < 0) {
			throw new SalesTransactionError(
				SALES_TX_ERROR_CODES.VALIDATION,
				"El tipo impositivo no puede ser negativo.",
			);
		}
	}
}

/**
 * Finaliza una venta (Fase C1/C2): TX única, idempotencia, stock y persistencia (sin pagos).
 */
export async function finalizeSale(
	input: FinalizeSaleInput,
): Promise<FinalizeSaleResult> {
	validateFinalizeSaleInput(input);

	const { businessId, userId } = await resolvePosBusinessContext();
	const session = await requireOpenCashSessionForPos({
		cash_session_id: input.cash_session_id,
	});

	const terminalId = input.terminal_id?.trim() || session.terminal_id;
	const idempotencyKey = buildSaleIdempotencyKey({
		businessId,
		operation: "finalize_sale",
		clientRequestId: input.client_request_id.trim(),
	});

	const lines = input.lines.map((line) => computeSaleLine(line));

	return await executeFinalizeSaleCommand({
		business_id: businessId,
		user_id: userId,
		idempotency_key: idempotencyKey,
		cash_session_id: session.id,
		terminal_id: terminalId,
		warehouse_id: input.warehouse_id.trim(),
		payment_method: input.payment_method,
		notes: input.notes?.trim() ?? "",
		lines,
	});
}
