import { db } from "../../lib/db.server";
import type { StockMovementType } from "../inventory/types";
import { getCashSessionById } from "./cash-session-queries.server";
import { listSalePaymentsBySale } from "./sale-payment-queries.server";
import { resolvePosBusinessContext } from "./sales-access.server";
import {
	SALES_TX_ERROR_CODES,
	SalesTransactionError,
} from "./transaction/errors";
import { buildSaleStockMovementReason } from "./transaction/finalize-sale-stock.server";
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

const DEFAULT_RECENT_SALES_LIMIT = 50;
const MAX_RECENT_SALES_LIMIT = 100;

type SaleDbRow = {
	id: string;
	business_id: string;
	cash_session_id: string;
	terminal_id: string;
	receipt_number: string | number;
	status: SaleStatus;
	subtotal: string | number;
	tax_total: string | number;
	discount_total: string | number;
	total: string | number;
	payment_method: SalePaymentMethod | null;
	notes: string;
	created_by_user_id: string;
	idempotency_key: string | null;
	created_at: string;
	updated_at: string;
};

type SaleItemDbRow = {
	id: string;
	sale_id: string;
	product_id: string;
	product_name: string;
	quantity: string | number;
	unit_price: string | number;
	discount_percent: string | number;
	tax_rate: string | number;
	line_total: string | number;
	sort_order: number;
	created_at: string;
};

const SALE_COLUMNS = `
  id::text,
  business_id::text,
  cash_session_id::text,
  terminal_id,
  receipt_number,
  status,
  subtotal::float8 AS subtotal,
  tax_total::float8 AS tax_total,
  discount_total::float8 AS discount_total,
  total::float8 AS total,
  payment_method,
  notes,
  created_by_user_id::text,
  idempotency_key,
  created_at::text,
  updated_at::text
`;

const SALE_ITEM_COLUMNS = `
  id::text,
  sale_id::text,
  product_id::text,
  product_name,
  quantity::float8 AS quantity,
  unit_price::float8 AS unit_price,
  discount_percent::float8 AS discount_percent,
  tax_rate::float8 AS tax_rate,
  line_total::float8 AS line_total,
  sort_order,
  created_at::text
`;

function mapSaleRow(row: SaleDbRow): SaleRow {
	return {
		...row,
		receipt_number: Number(row.receipt_number),
		subtotal: Number(row.subtotal),
		tax_total: Number(row.tax_total),
		discount_total: Number(row.discount_total),
		total: Number(row.total),
	};
}

function mapSaleItemRow(row: SaleItemDbRow): SaleItemRow {
	return {
		...row,
		quantity: Number(row.quantity),
		unit_price: Number(row.unit_price),
		discount_percent: Number(row.discount_percent),
		tax_rate: Number(row.tax_rate),
		line_total: Number(row.line_total),
	};
}

function mapStockMovementRow(row: {
	id: string;
	product_id: string;
	product_name: string;
	warehouse_id: string;
	movement_type: StockMovementType;
	quantity: string | number;
	previous_quantity: string | number;
	new_quantity: string | number;
	reason: string;
	performed_by_user_id: string;
	created_at: string;
}): SaleStockMovementReadModel {
	return {
		...row,
		quantity: Number(row.quantity),
		previous_quantity: Number(row.previous_quantity),
		new_quantity: Number(row.new_quantity),
	};
}

async function findSaleById(
	businessId: string,
	saleId: string,
): Promise<SaleRow | null> {
	const result = await db.query<SaleDbRow>(
		`
    SELECT ${SALE_COLUMNS}
    FROM sales
    WHERE business_id = $1
      AND id = $2
    LIMIT 1
  `,
		[businessId, saleId],
	);

	const row = result.rows[0];
	return row ? mapSaleRow(row) : null;
}

async function findSaleByReceiptNumber(
	businessId: string,
	receiptNumber: number,
): Promise<SaleRow | null> {
	const result = await db.query<SaleDbRow>(
		`
    SELECT ${SALE_COLUMNS}
    FROM sales
    WHERE business_id = $1
      AND receipt_number = $2
    LIMIT 1
  `,
		[businessId, receiptNumber],
	);

	const row = result.rows[0];
	return row ? mapSaleRow(row) : null;
}

async function listSaleItemsForSale(saleId: string): Promise<SaleItemRow[]> {
	const result = await db.query<SaleItemDbRow>(
		`
    SELECT ${SALE_ITEM_COLUMNS}
    FROM sale_items
    WHERE sale_id = $1
    ORDER BY sort_order ASC, created_at ASC
  `,
		[saleId],
	);

	return result.rows.map(mapSaleItemRow);
}

async function listStockMovementsForSale(
	saleId: string,
): Promise<SaleStockMovementReadModel[]> {
	const result = await db.query<{
		id: string;
		product_id: string;
		product_name: string;
		warehouse_id: string;
		movement_type: StockMovementType;
		quantity: string | number;
		previous_quantity: string | number;
		new_quantity: string | number;
		reason: string;
		performed_by_user_id: string;
		created_at: string;
	}>(
		`
    SELECT
      sm.id::text,
      sm.product_id::text,
      p.name AS product_name,
      sm.warehouse_id,
      sm.movement_type,
      sm.quantity::float8 AS quantity,
      sm.previous_quantity::float8 AS previous_quantity,
      sm.new_quantity::float8 AS new_quantity,
      sm.reason,
      sm.performed_by_user_id::text,
      sm.created_at::text
    FROM stock_movements sm
    JOIN products p ON p.id = sm.product_id
    WHERE sm.reason = $1
    ORDER BY sm.created_at ASC
  `,
		[buildSaleStockMovementReason(saleId)],
	);

	return result.rows.map(mapStockMovementRow);
}

async function listRecentSaleSummaries(
	businessId: string,
	input: ListRecentSalesForPosInput,
): Promise<SaleReceiptSummary[]> {
	const limit = Math.min(
		Math.max(input.limit ?? DEFAULT_RECENT_SALES_LIMIT, 1),
		MAX_RECENT_SALES_LIMIT,
	);
	const terminalId = input.terminal_id?.trim();

	const result = terminalId
		? await db.query<SaleDbRow>(
				`
        SELECT ${SALE_COLUMNS}
        FROM sales
        WHERE business_id = $1
          AND terminal_id = $2
        ORDER BY created_at DESC
        LIMIT $3
      `,
				[businessId, terminalId, limit],
			)
		: await db.query<SaleDbRow>(
				`
        SELECT ${SALE_COLUMNS}
        FROM sales
        WHERE business_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `,
				[businessId, limit],
			);

	return result.rows.map((row) => {
		const sale = mapSaleRow(row);
		return {
			id: sale.id,
			receipt_number: sale.receipt_number,
			status: sale.status,
			total: sale.total,
			payment_method: sale.payment_method,
			terminal_id: sale.terminal_id,
			created_at: sale.created_at,
			created_by_user_id: sale.created_by_user_id,
		};
	});
}

async function buildSaleReceiptReadModel(
	businessId: string,
	sale: SaleRow,
): Promise<SaleReceiptReadModel> {
	const [items, payments, cashSession, stockMovements] = await Promise.all([
		listSaleItemsForSale(sale.id),
		listSalePaymentsBySale(businessId, sale.id),
		getCashSessionById(businessId, sale.cash_session_id),
		listStockMovementsForSale(sale.id),
	]);

	if (!cashSession) {
		throw new SalesTransactionError(
			SALES_TX_ERROR_CODES.CASH_SESSION_NOT_FOUND,
			"Sesión de caja de la venta no encontrada.",
		);
	}

	return {
		sale,
		items,
		payments,
		cash_session: cashSession,
		stock_movements: stockMovements,
	};
}

function assertSaleFound(sale: SaleRow | null): asserts sale is SaleRow {
	if (!sale) {
		throw new SalesTransactionError(
			SALES_TX_ERROR_CODES.SALE_NOT_FOUND,
			"Venta no encontrada.",
		);
	}
}

export async function getSaleReceiptByIdForPos(
	saleId: string,
): Promise<SaleReceiptReadModel> {
	const { businessId } = await resolvePosBusinessContext();
	const sale = await findSaleById(businessId, saleId);
	assertSaleFound(sale);
	return await buildSaleReceiptReadModel(businessId, sale);
}

export async function getSaleReceiptByReceiptNumberForPos(
	receiptNumber: number,
): Promise<SaleReceiptReadModel> {
	if (!Number.isFinite(receiptNumber) || receiptNumber < 1) {
		throw new SalesTransactionError(
			SALES_TX_ERROR_CODES.VALIDATION,
			"Número de ticket inválido.",
		);
	}

	const { businessId } = await resolvePosBusinessContext();
	const sale = await findSaleByReceiptNumber(businessId, receiptNumber);
	assertSaleFound(sale);
	return await buildSaleReceiptReadModel(businessId, sale);
}

export async function listRecentSalesForPos(
	input: ListRecentSalesForPosInput = {},
): Promise<SaleReceiptSummary[]> {
	const { businessId } = await resolvePosBusinessContext();
	return await listRecentSaleSummaries(businessId, input);
}
