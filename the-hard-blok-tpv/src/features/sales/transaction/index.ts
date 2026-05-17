/**
 * Foundations transaccionales de ventas (no operativo).
 * @see docs/architecture/sales-transaction-architecture.md
 */

export type { SalesFinalizeStep } from "./boundaries";
export {
	assertSalesTransactionNotImplemented,
	CASH_SESSION_BOUNDARY,
	finalizeSale,
	finalizeSaleStub,
	SALES_FINALIZE_BOUNDARY,
} from "./boundaries";
export type { SalesTxErrorCode } from "./errors";
export {
	isSalesTransactionError,
	SALES_TX_ERROR_CODES,
	SalesTransactionError,
} from "./errors";
export { executeFinalizeSaleCommand } from "./finalize-sale-command.server";
export {
	aggregateSaleLinesByProduct,
	decrementStockForSale,
	SALE_STOCK_MOVEMENT_TYPE,
} from "./finalize-sale-stock.server";
export {
	computeSaleLine,
	computeSaleTotals,
	roundMoney,
} from "./finalize-sale-totals";
export type {
	BuildSaleIdempotencyKeyInput,
	ParsedSaleIdempotencyKey,
} from "./idempotency";
export {
	buildSaleIdempotencyKey,
	parseSaleIdempotencyKey,
} from "./idempotency";
export type {
	CashSessionRow,
	SaleIdempotencyKeyRow,
	SaleItemRow,
	SaleRow,
} from "./schema-types";
export type {
	CashSessionStatus,
	ClientTicketPhase,
	FinalizeSaleInput,
	FinalizeSaleResult,
	SaleIdempotentOperation,
	SaleLineInput,
	SalePaymentMethod,
	SaleStatus,
	SaleTransactionContext,
} from "./types";
export {
	CASH_SESSION_STATUSES,
	CLIENT_TICKET_PHASES,
	SALE_IDEMPOTENT_OPERATIONS,
	SALE_PAYMENT_METHODS,
	SALE_STATUSES,
} from "./types";
