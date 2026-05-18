import { isSalesTransactionError } from "./transaction/errors";
import type { SaleLineInput } from "./transaction/types";
import type { TicketItem } from "./use-ticket";

/** Terminal POS por defecto (hasta configuración por negocio). */
export const POS_DEFAULT_TERMINAL_ID = "tpv-1";
export const POS_DEFAULT_TAX_RATE_PERCENT = 10;

/** @deprecated Usar almacén operativo resuelto en servidor — no hardcodear IDs. */
export const POS_DEFAULT_WAREHOUSE_ID = "principal";

export function buildFinalizeSaleLinesFromTicket(
	items: TicketItem[],
	taxRatePercent = POS_DEFAULT_TAX_RATE_PERCENT,
): SaleLineInput[] {
	return items.map((item) => ({
		product_id: item.id,
		product_name: item.name,
		quantity: item.quantity,
		unit_price: item.price,
		discount_percent: item.discountPercent,
		tax_rate: taxRatePercent,
	}));
}

export function getPosSaleErrorMessage(error: unknown): string {
	if (isSalesTransactionError(error)) {
		return error.message;
	}

	if (error instanceof Error && error.message) {
		return error.message;
	}

	if (
		typeof error === "object" &&
		error !== null &&
		"message" in error &&
		typeof (error as { message: unknown }).message === "string"
	) {
		return (error as { message: string }).message;
	}

	return "No se pudo completar la venta.";
}
