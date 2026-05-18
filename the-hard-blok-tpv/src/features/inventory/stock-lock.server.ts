import type { PoolClient } from "pg";

/**
 * Garantiza fila product_stock y la bloquea; devuelve cantidad actual (0 si nueva).
 */
export async function lockProductStockQuantity(
	client: PoolClient,
	productId: string,
	warehouseId: string,
): Promise<number> {
	await client.query(
		`
    INSERT INTO product_stock (product_id, warehouse_id, quantity)
    VALUES ($1, $2, 0)
    ON CONFLICT (product_id, warehouse_id) DO NOTHING
    `,
		[productId, warehouseId],
	);

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
		throw new Error("No se pudo bloquear stock del producto.");
	}

	return Number(row.quantity);
}

export async function updateProductStockQuantity(
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

export async function insertStockMovement(
	client: PoolClient,
	data: {
		product_id: string;
		warehouse_id: string;
		movement_type: string;
		quantity: number;
		previous_quantity: number;
		new_quantity: number;
		reason: string;
		performed_by_user_id: string;
		reason_code?: string | null;
		note?: string | null;
		correlation_id?: string | null;
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
      reason_code,
      note,
      correlation_id,
      performed_by_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `,
		[
			data.product_id,
			data.warehouse_id,
			data.movement_type,
			data.quantity,
			data.previous_quantity,
			data.new_quantity,
			data.reason,
			data.reason_code ?? null,
			data.note ?? null,
			data.correlation_id ?? null,
			data.performed_by_user_id,
		],
	);
}
