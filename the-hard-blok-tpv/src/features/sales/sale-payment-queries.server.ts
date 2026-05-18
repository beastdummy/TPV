import type { PoolClient } from "pg";

import { db } from "../../lib/db.server";
import type { SalePaymentRow } from "./transaction/schema-types";
import type {
	SalePaymentMethod,
	SalePaymentProvider,
	SalePaymentStatus,
} from "./transaction/types";

type SalePaymentDbRow = {
	id: string;
	sale_id: string;
	business_id: string;
	payment_method: SalePaymentMethod;
	amount: string | number;
	currency: string;
	status: SalePaymentStatus;
	provider: SalePaymentProvider;
	provider_reference: string | null;
	created_at: string;
	processed_at: string | null;
};

const SALE_PAYMENT_COLUMNS = `
  id::text,
  sale_id::text,
  business_id::text,
  payment_method,
  amount::float8 AS amount,
  currency,
  status,
  provider,
  provider_reference,
  created_at::text,
  processed_at::text
`;

function mapSalePaymentRow(row: SalePaymentDbRow): SalePaymentRow {
	return {
		...row,
		amount: Number(row.amount),
	};
}

export type InsertSalePaymentInput = {
	sale_id: string;
	business_id: string;
	payment_method: SalePaymentMethod;
	amount: number;
	currency: string;
	status: SalePaymentStatus;
	provider: SalePaymentProvider;
	provider_reference?: string | null;
	processed_at?: string | null;
};

export async function insertSalePayment(
	input: InsertSalePaymentInput,
	client?: PoolClient,
): Promise<SalePaymentRow> {
	const sql = `
    INSERT INTO sale_payments (
      sale_id,
      business_id,
      payment_method,
      amount,
      currency,
      status,
      provider,
      provider_reference,
      processed_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING ${SALE_PAYMENT_COLUMNS}
  `;

	const params = [
		input.sale_id,
		input.business_id,
		input.payment_method,
		input.amount,
		input.currency,
		input.status,
		input.provider,
		input.provider_reference ?? null,
		input.processed_at ?? null,
	];

	const result = client
		? await client.query<SalePaymentDbRow>(sql, params)
		: await db.query<SalePaymentDbRow>(sql, params);

	const row = result.rows[0];
	if (!row) {
		throw new Error("No se pudo insertar el pago de la venta.");
	}

	return mapSalePaymentRow(row);
}

export async function listSalePaymentsBySale(
	businessId: string,
	saleId: string,
	client?: PoolClient,
): Promise<SalePaymentRow[]> {
	const sql = `
    SELECT ${SALE_PAYMENT_COLUMNS}
    FROM sale_payments
    WHERE business_id = $1
      AND sale_id = $2
    ORDER BY created_at ASC
  `;

	const result = client
		? await client.query<SalePaymentDbRow>(sql, [businessId, saleId])
		: await db.query<SalePaymentDbRow>(sql, [businessId, saleId]);

	return result.rows.map(mapSalePaymentRow);
}
