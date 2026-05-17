import type {
	CashSessionStatus,
	SalePaymentMethod,
	SalePaymentProvider,
	SalePaymentStatus,
	SaleStatus,
} from "./types";

/** Fila `cash_sessions` (Fase A). */
export type CashSessionRow = {
	id: string;
	business_id: string;
	terminal_id: string;
	status: CashSessionStatus;
	opening_float: number;
	closing_amount: number | null;
	opened_by_user_id: string;
	closed_by_user_id: string | null;
	opened_at: string;
	closed_at: string | null;
	notes: string;
	created_at: string;
	updated_at: string;
};

/** Fila `sales` (Fase A). */
export type SaleRow = {
	id: string;
	business_id: string;
	cash_session_id: string;
	terminal_id: string;
	receipt_number: number;
	status: SaleStatus;
	subtotal: number;
	tax_total: number;
	discount_total: number;
	total: number;
	payment_method: SalePaymentMethod | null;
	notes: string;
	created_by_user_id: string;
	idempotency_key: string | null;
	created_at: string;
	updated_at: string;
};

/** Fila `sale_items` (Fase A). */
export type SaleItemRow = {
	id: string;
	sale_id: string;
	product_id: string;
	product_name: string;
	quantity: number;
	unit_price: number;
	discount_percent: number;
	tax_rate: number;
	line_total: number;
	sort_order: number;
	created_at: string;
};

/** Fila `sale_payments` (foundations internas). */
export type SalePaymentRow = {
	id: string;
	sale_id: string;
	business_id: string;
	payment_method: SalePaymentMethod;
	amount: number;
	currency: string;
	status: SalePaymentStatus;
	provider: SalePaymentProvider;
	provider_reference: string | null;
	created_at: string;
	processed_at: string | null;
};

/** Fila `sale_idempotency_keys` (Fase A). */
export type SaleIdempotencyKeyRow = {
	id: string;
	business_id: string;
	idempotency_key: string;
	operation: "finalize_sale";
	sale_id: string | null;
	response_payload: Record<string, unknown> | null;
	response_hash: string | null;
	created_at: string;
	completed_at: string | null;
};
