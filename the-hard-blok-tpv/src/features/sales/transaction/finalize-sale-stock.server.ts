import type { PoolClient } from "pg";
import {
	insertStockMovement,
	lockProductStockQuantity,
	updateProductStockQuantity,
} from "../../inventory/stock-lock.server";
import type { NegativeStockSaleItem } from "../../inventory/stock-movement-types";
import type { ComputedSaleLine } from "./finalize-sale-totals";

/** Salida de stock por venta. */
export const SALE_STOCK_MOVEMENT_TYPE = "sale" as const;

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

/**
 * Decrementa stock agregado por producto dentro de la TX de finalizeSale.
 * Nunca bloquea por stock insuficiente; puede dejar cantidades negativas.
 */
export async function decrementStockForSale(
	client: PoolClient,
	input: {
		warehouse_id: string;
		user_id: string;
		sale_id: string;
		lines: Pick<ComputedSaleLine, "product_id" | "product_name" | "quantity">[];
	},
): Promise<NegativeStockSaleItem[]> {
	const aggregates = aggregateSaleLinesByProduct(input.lines);
	const reason = buildSaleStockMovementReason(input.sale_id);
	const lineNames = new Map(
		input.lines.map((line) => [line.product_id, line.product_name]),
	);
	const negativeItems: NegativeStockSaleItem[] = [];

	for (const aggregate of aggregates) {
		const productName =
			lineNames.get(aggregate.product_id) ?? aggregate.product_id;
		const previousQuantity = await lockProductStockQuantity(
			client,
			aggregate.product_id,
			input.warehouse_id,
		);

		const newQuantity = previousQuantity - aggregate.quantity;

		await updateProductStockQuantity(
			client,
			aggregate.product_id,
			input.warehouse_id,
			newQuantity,
		);

		await insertStockMovement(client, {
			product_id: aggregate.product_id,
			warehouse_id: input.warehouse_id,
			movement_type: SALE_STOCK_MOVEMENT_TYPE,
			quantity: aggregate.quantity,
			previous_quantity: previousQuantity,
			new_quantity: newQuantity,
			reason,
			performed_by_user_id: input.user_id,
		});

		if (newQuantity < 0) {
			negativeItems.push({
				product_id: aggregate.product_id,
				product_name: productName,
				warehouse_id: input.warehouse_id,
				before_quantity: previousQuantity,
				sold_quantity: aggregate.quantity,
				after_quantity: newQuantity,
			});
		}
	}

	return negativeItems;
}
