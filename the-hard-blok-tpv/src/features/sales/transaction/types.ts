/**
 * Tipos de dominio para ventas transaccionales.
 * Scaffolding — no implica tablas ni RPC implementados.
 */

/** Estados persistidos en `sales.status` (alineado con dashboard). */
export const SALE_STATUSES = [
	"pending",
	"completed",
	"cancelled",
	"refunded",
] as const;

export type SaleStatus = (typeof SALE_STATUSES)[number];

/** Métodos de pago agregados (MVP / dashboard). */
export const SALE_PAYMENT_METHODS = ["cash", "card", "mixed"] as const;

export type SalePaymentMethod = (typeof SALE_PAYMENT_METHODS)[number];

/** Sesión de caja. */
export const CASH_SESSION_STATUSES = [
	"open",
	"closing",
	"closed",
	"suspended",
] as const;

export type CashSessionStatus = (typeof CASH_SESSION_STATUSES)[number];

/** Fases del ticket en cliente antes de persistir. */
export const CLIENT_TICKET_PHASES = [
	"draft",
	"submitting",
	"committed",
	"failed",
] as const;

export type ClientTicketPhase = (typeof CLIENT_TICKET_PHASES)[number];

/** Operaciones que admitirán idempotencia. */
export const SALE_IDEMPOTENT_OPERATIONS = ["finalize_sale"] as const;

export type SaleIdempotentOperation =
	(typeof SALE_IDEMPOTENT_OPERATIONS)[number];

/** Línea de venta enviada al servidor (snapshot en persistencia). */
export type SaleLineInput = {
	product_id: string;
	product_name: string;
	quantity: number;
	unit_price: number;
	discount_percent: number;
	tax_rate?: number;
};

/** Payload previsto para finalize (NO USAR en producción aún). */
export type FinalizeSaleInput = {
	client_request_id: string;
	cash_session_id: string;
	terminal_id?: string;
	warehouse_id: string;
	payment_method: SalePaymentMethod;
	lines: SaleLineInput[];
	notes?: string;
};

/** Respuesta prevista tras finalize exitoso. */
export type FinalizeSaleResult = {
	sale_id: string;
	receipt_number: number;
	status: Extract<SaleStatus, "completed">;
	total: number;
	idempotency_key: string;
};

/** Contexto de tenant resuelto antes de cualquier comando de escritura. */
export type SaleTransactionContext = {
	business_id: string;
	user_id: string;
	role: string;
	/** Cuando exista membresía explícita en el comando. */
	cash_session_id?: string;
};
