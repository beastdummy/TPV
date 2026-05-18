import type { PoolClient } from "pg";

import { db } from "../../../lib/db.server";
import { SALES_TX_ERROR_CODES, SalesTransactionError } from "./errors";
import {
	insertInternalSalePaymentSnapshot,
	mapSalePaymentToSnapshot,
} from "./finalize-sale-payment.server";
import { decrementStockForSale } from "./finalize-sale-stock.server";
import {
	type ComputedSaleLine,
	computeSaleLine,
	computeSaleTotals,
} from "./finalize-sale-totals";
import type {
	FinalizeSalePaymentSnapshot,
	FinalizeSaleResult,
	SalePaymentMethod,
} from "./types";

export type ExecuteFinalizeSaleCommandInput = {
	business_id: string;
	user_id: string;
	served_by_membership_id: string;
	idempotency_key: string;
	cash_session_id: string;
	terminal_id: string;
	warehouse_id: string;
	payment_method: SalePaymentMethod;
	notes: string;
	lines: ComputedSaleLine[];
};

type IdempotencyRow = {
	id: string;
	sale_id: string | null;
	response_payload: FinalizeSaleResult | null;
	completed_at: string | null;
};

type SaleHeaderRow = {
	id: string;
	receipt_number: string | number;
	total: string | number;
};

function mapFinalizeResult(
	row: SaleHeaderRow,
	idempotencyKey: string,
	payment: FinalizeSalePaymentSnapshot,
): FinalizeSaleResult {
	return {
		sale_id: row.id,
		receipt_number: Number(row.receipt_number),
		status: "completed",
		total: Number(row.total),
		idempotency_key: idempotencyKey,
		payment,
	};
}

function parseIdempotencyPayload(
	payload: unknown,
	idempotencyKey: string,
): FinalizeSaleResult | null {
	if (!payload || typeof payload !== "object") {
		return null;
	}

	const data = payload as Partial<FinalizeSaleResult>;
	const payment = data.payment;
	if (
		typeof data.sale_id !== "string" ||
		typeof data.receipt_number !== "number" ||
		data.status !== "completed" ||
		typeof data.total !== "number" ||
		!payment ||
		typeof payment !== "object" ||
		typeof payment.payment_id !== "string" ||
		typeof payment.amount !== "number"
	) {
		return null;
	}

	return {
		sale_id: data.sale_id,
		receipt_number: data.receipt_number,
		status: "completed",
		total: data.total,
		idempotency_key: idempotencyKey,
		payment: payment as FinalizeSalePaymentSnapshot,
	};
}

async function lockCashSession(
	client: PoolClient,
	businessId: string,
	cashSessionId: string,
): Promise<void> {
	const result = await client.query<{ status: string }>(
		`
    SELECT status
    FROM cash_sessions
    WHERE business_id = $1
      AND id = $2
    FOR UPDATE
  `,
		[businessId, cashSessionId],
	);

	const row = result.rows[0];
	if (!row) {
		throw new SalesTransactionError(
			SALES_TX_ERROR_CODES.CASH_SESSION_NOT_FOUND,
			"Sesión de caja no encontrada.",
		);
	}

	if (row.status !== "open") {
		throw new SalesTransactionError(
			SALES_TX_ERROR_CODES.CASH_SESSION_NOT_OPEN,
			"No hay sesión de caja abierta para registrar ventas.",
		);
	}
}

async function claimOrReadIdempotency(
	client: PoolClient,
	businessId: string,
	idempotencyKey: string,
): Promise<IdempotencyRow> {
	await client.query(
		`
    INSERT INTO sale_idempotency_keys (business_id, idempotency_key, operation)
    VALUES ($1, $2, 'finalize_sale')
    ON CONFLICT (business_id, idempotency_key) DO NOTHING
  `,
		[businessId, idempotencyKey],
	);

	const result = await client.query<IdempotencyRow>(
		`
    SELECT
      id::text,
      sale_id::text,
      response_payload,
      completed_at::text
    FROM sale_idempotency_keys
    WHERE business_id = $1
      AND idempotency_key = $2
    FOR UPDATE
  `,
		[businessId, idempotencyKey],
	);

	const row = result.rows[0];
	if (!row) {
		throw new SalesTransactionError(
			SALES_TX_ERROR_CODES.INTERNAL,
			"No se pudo reservar la clave de idempotencia.",
		);
	}

	return row;
}

async function allocateReceiptNumber(
	client: PoolClient,
	businessId: string,
): Promise<number> {
	await client.query(`SELECT pg_advisory_xact_lock(hashtext($1::text))`, [
		businessId,
	]);

	const result = await client.query<{ next_receipt: string | number }>(
		`
    SELECT COALESCE(MAX(receipt_number), 0) + 1 AS next_receipt
    FROM sales
    WHERE business_id = $1
  `,
		[businessId],
	);

	return Number(result.rows[0]?.next_receipt ?? 1);
}

async function insertSaleHeader(
	client: PoolClient,
	input: ExecuteFinalizeSaleCommandInput,
	totals: ReturnType<typeof computeSaleTotals>,
	receiptNumber: number,
): Promise<SaleHeaderRow> {
	const result = await client.query<SaleHeaderRow>(
		`
    INSERT INTO sales (
      business_id,
      cash_session_id,
      terminal_id,
      receipt_number,
      status,
      subtotal,
      tax_total,
      discount_total,
      total,
      payment_method,
      notes,
      created_by_user_id,
      served_by_membership_id,
      idempotency_key
    )
    VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING id::text, receipt_number, total
  `,
		[
			input.business_id,
			input.cash_session_id,
			input.terminal_id,
			receiptNumber,
			totals.subtotal,
			totals.tax_total,
			totals.discount_total,
			totals.total,
			input.payment_method,
			input.notes,
			input.user_id,
			input.served_by_membership_id,
			input.idempotency_key,
		],
	);

	const row = result.rows[0];
	if (!row) {
		throw new SalesTransactionError(
			SALES_TX_ERROR_CODES.INTERNAL,
			"No se pudo crear la venta.",
		);
	}

	return row;
}

async function insertSaleItems(
	client: PoolClient,
	saleId: string,
	lines: ComputedSaleLine[],
): Promise<void> {
	for (const [index, line] of lines.entries()) {
		await client.query(
			`
      INSERT INTO sale_items (
        sale_id,
        product_id,
        product_name,
        quantity,
        unit_price,
        discount_percent,
        tax_rate,
        line_total,
        sort_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
			[
				saleId,
				line.product_id,
				line.product_name,
				line.quantity,
				line.unit_price,
				line.discount_percent,
				line.tax_rate,
				line.line_total,
				index,
			],
		);
	}
}

async function completeSale(client: PoolClient, saleId: string): Promise<void> {
	await client.query(
		`
    UPDATE sales
    SET status = 'completed', updated_at = NOW()
    WHERE id = $1
  `,
		[saleId],
	);
}

async function storeIdempotencyResult(
	client: PoolClient,
	businessId: string,
	idempotencyKey: string,
	saleId: string,
	result: FinalizeSaleResult,
): Promise<void> {
	await client.query(
		`
    UPDATE sale_idempotency_keys
    SET
      sale_id = $3,
      response_payload = $4::jsonb,
      completed_at = NOW()
    WHERE business_id = $1
      AND idempotency_key = $2
  `,
		[businessId, idempotencyKey, saleId, JSON.stringify(result)],
	);
}

function isUniqueViolation(error: unknown) {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code: string }).code === "23505"
	);
}

function mapCommandError(error: unknown): never {
	if (error instanceof SalesTransactionError) {
		throw error;
	}

	if (isUniqueViolation(error)) {
		throw new SalesTransactionError(
			SALES_TX_ERROR_CODES.CONCURRENCY,
			"Conflicto al asignar número de ticket. Reintenta la venta.",
		);
	}

	throw error;
}

export async function executeFinalizeSaleCommand(
	input: ExecuteFinalizeSaleCommandInput,
): Promise<FinalizeSaleResult> {
	const lines = input.lines.map((line) => computeSaleLine(line));
	const totals = computeSaleTotals(lines);
	const client = await db.connect();

	try {
		await client.query("BEGIN");

		await lockCashSession(client, input.business_id, input.cash_session_id);

		const idempotency = await claimOrReadIdempotency(
			client,
			input.business_id,
			input.idempotency_key,
		);

		if (idempotency.completed_at) {
			const cached = parseIdempotencyPayload(
				idempotency.response_payload,
				input.idempotency_key,
			);
			if (cached) {
				await client.query("COMMIT");
				return cached;
			}
		}

		if (idempotency.sale_id && !idempotency.completed_at) {
			throw new SalesTransactionError(
				SALES_TX_ERROR_CODES.IDEMPOTENCY_CONFLICT,
				"La venta está en proceso. Reintenta en unos segundos.",
			);
		}

		const receiptNumber = await allocateReceiptNumber(
			client,
			input.business_id,
		);

		const sale = await insertSaleHeader(client, input, totals, receiptNumber);

		await insertSaleItems(client, sale.id, lines);

		await decrementStockForSale(client, {
			warehouse_id: input.warehouse_id,
			user_id: input.user_id,
			sale_id: sale.id,
			lines,
		});

		const paymentRow = await insertInternalSalePaymentSnapshot(client, {
			sale_id: sale.id,
			business_id: input.business_id,
			payment_method: input.payment_method,
			amount: totals.total,
		});

		await completeSale(client, sale.id);

		const result = mapFinalizeResult(
			sale,
			input.idempotency_key,
			mapSalePaymentToSnapshot(paymentRow),
		);

		await storeIdempotencyResult(
			client,
			input.business_id,
			input.idempotency_key,
			sale.id,
			result,
		);

		await client.query("COMMIT");
		return result;
	} catch (error) {
		await client.query("ROLLBACK");
		mapCommandError(error);
	} finally {
		client.release();
	}
}
