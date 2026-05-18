import type { StockMovementType } from "../inventory/types";
import type {
	CashSessionRow,
	SaleItemRow,
	SalePaymentRow,
	SaleRow,
} from "./transaction/schema-types";
import type { SalePaymentMethod, SaleStatus } from "./transaction/types";

export type SaleStockMovementReadModel = {
	id: string;
	product_id: string;
	product_name: string;
	warehouse_id: string;
	movement_type: StockMovementType;
	quantity: number;
	previous_quantity: number;
	new_quantity: number;
	reason: string;
	performed_by_user_id: string;
	created_at: string;
};

export type SaleReceiptReadModel = {
	sale: SaleRow;
	items: SaleItemRow[];
	payments: SalePaymentRow[];
	cash_session: CashSessionRow;
	stock_movements: SaleStockMovementReadModel[];
};

export type SaleReceiptSummary = {
	id: string;
	receipt_number: number;
	status: SaleStatus;
	total: number;
	payment_method: SalePaymentMethod | null;
	terminal_id: string;
	created_at: string;
	created_by_user_id: string;
};

export type ListRecentSalesForPosInput = {
	limit?: number;
	terminal_id?: string;
};
