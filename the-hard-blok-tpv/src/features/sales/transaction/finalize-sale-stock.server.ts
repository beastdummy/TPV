import type { PoolClient } from "pg";

import { SALES_TX_ERROR_CODES, SalesTransactionError } from "./errors";
import type { ComputedSaleLine } from "./finalize-sale-totals";

/** Salida de stock por venta (CHECK DB: movement_type = 'out'). */
export const SALE_STOCK_MOVEMENT_TYPE = "out" as const;

export type SaleStockAggregate = {
	product_id: string;
	quantity: number;
};

export function aggregateSaleLinesByProduct(
	lines: Pick<ComputedSaleLine, "product_id" | "quantity">[],
): SaleStockAggregate[] {
	const totals = new Map<string, number>();

	for (const line of lines) {
		totals.set(
			line.product_id,
			(totals.get(line.product_id) ?? 0) + line.quantity,
		);
	}

	return Array.from(totals.entries())
		.map(([product_id, quantity]) => ({ product_id, quantity }))
		.sort((a, b) => a.product_id.localeCompare(b.product_id));
}

export function buildSaleStockMovementReason(saleId: string): string {
	return `Venta ${saleId}`;
}

async function lockProductStockQuantity(
	client: PoolClient,
	productId: string,
	warehouseId: string,
): Promise<number> {
	const result = await client.query<{ quantity: string | number }>(
		`
    SELECT quantity::float8 AS quantity
    FROM product_stock
    WHERE product_id = $1
      AND warehouse_id = $2
    FOR UPDATE
  `,
		[productId, warehouseId],
	);

	const row = result.rows[0];
	if (!row) {
		throw new SalesTransactionError(
			SALES_TX_ERROR_CODES.STOCK_NOT_FOUND,
			"No hay stock registrado para el producto en este almacén.",
		);
	}

	return Number(row.quantity);
}

async function updateProductStockQuantity(
	client: PoolClient,
	productId: string,
	warehouseId: string,
	newQuantity: number,
): Promise<void> {
	await client.query(
		`
    UPDATE product_stock
    SET quantity = $3, updated_at = NOW()
    WHERE product_id = $1
      AND warehouse_id = $2
  `,
		[productId, warehouseId, newQuantity],
	);
}

async function insertSaleStockMovement(
	client: PoolClient,
	data: {
		product_id: string;
		warehouse_id: string;
		quantity: number;
		previous_quantity: number;
		new_quantity: number;
		reason: string;
		performed_by_user_id: string;
	},
): Promise<void> {
	await client.query(
		`
    INSERT INTO stock_movements (
      product_id,
      warehouse_id,
      movement_type,
      quantity,
      previous_quantity,
      new_quantity,
      reason,
      performed_by_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `,
		[
			data.product_id,
			data.warehouse_id,
			SALE_STOCK_MOVEMENT_TYPE,
			data.quantity,
			data.previous_quantity,
			data.new_quantity,
			data.reason,
			data.performed_by_user_id,
		],
	);
}

/**
 * Decrementa stock agregado por producto dentro de la TX de finalizeSale.
 * Orden determinista de bloqueos para evitar deadlocks.
 */
export async function decrementStockForSale(
	client: PoolClient,
	input: {
		warehouse_id: string;
		user_id: string;
		sale_id: string;
		lines: Pick<ComputedSaleLine, "product_id" | "quantity">[];
	},
): Promise<void> {
	const aggregates = aggregateSaleLinesByProduct(input.lines);
	const reason = buildSaleStockMovementReason(input.sale_id);

	for (const aggregate of aggregates) {
		const previousQuantity = await lockProductStockQuantity(
			client,
			aggregate.product_id,
			input.warehouse_id,
		);

		if (previousQuantity < aggregate.quantity) {
			throw new SalesTransactionError(
				SALES_TX_ERROR_CODES.INSUFFICIENT_STOCK,
				"Stock insuficiente para completar la venta.",
			);
		}

		const newQuantity = previousQuantity - aggregate.quantity;

		await updateProductStockQuantity(
			client,
			aggregate.product_id,
			input.warehouse_id,
			newQuantity,
		);

		await insertSaleStockMovement(client, {
			product_id: aggregate.product_id,
			warehouse_id: input.warehouse_id,
			quantity: aggregate.quantity,
			previous_quantity: previousQuantity,
			new_quantity: newQuantity,
			reason,
			performed_by_user_id: input.user_id,
		});
	}
}
