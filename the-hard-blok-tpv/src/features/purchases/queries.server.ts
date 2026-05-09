import type { PoolClient } from "pg";

import { db } from "../../lib/db.server";
import type { StockMovementType } from "../inventory/types";
import type { PurchaseReceiptListItem, Supplier } from "./types";

export async function getSuppliers() {
	const result = await db.query<Supplier>(
		`
    SELECT id::text, name, tax_id, email, phone, is_active
    FROM suppliers
    WHERE is_active = true
    ORDER BY name ASC
  `,
	);

	return result.rows;
}

export async function createSupplier(data: Omit<Supplier, "id" | "is_active">) {
	const result = await db.query<{ id: string }>(
		`
    INSERT INTO suppliers (
      name,
      tax_id,
      email,
      phone,
      is_active
    )
    VALUES ($1, $2, $3, $4, true)
    RETURNING id::text AS id
  `,
		[data.name, data.tax_id, data.email, data.phone],
	);

	return result.rows[0]?.id ?? null;
}

async function getCurrentStock(
	client: PoolClient,
	productId: string,
	warehouseId: string,
) {
	const stockResult = await client.query<{ quantity: number }>(
		`
    SELECT COALESCE(quantity, 0)::float8 AS quantity
    FROM product_stock
    WHERE product_id = $1
      AND warehouse_id = $2
  `,
		[productId, warehouseId],
	);

	return stockResult.rows[0]?.quantity ?? 0;
}

async function createStockMovementInTransaction(
	client: PoolClient,
	data: {
		product_id: string;
		warehouse_id: string;
		movement_type: StockMovementType;
		quantity: number;
		reason: string;
		performed_by_user_id: string;
	},
) {
	const previousQuantity = await getCurrentStock(
		client,
		data.product_id,
		data.warehouse_id,
	);
	const newQuantity = previousQuantity + data.quantity;

	await client.query(
		`
    INSERT INTO product_stock (
      product_id,
      warehouse_id,
      quantity
    )
    VALUES ($1, $2, $3)
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET
      quantity = EXCLUDED.quantity,
      updated_at = NOW()
  `,
		[data.product_id, data.warehouse_id, newQuantity],
	);

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
    VALUES ($1, $2, 'in', $3, $4, $5, $6, $7)
  `,
		[
			data.product_id,
			data.warehouse_id,
			data.quantity,
			previousQuantity,
			newQuantity,
			data.reason,
			data.performed_by_user_id,
		],
	);
}

export async function createPurchaseReceipt(data: {
	supplier_id: string;
	warehouse_id: string;
	product_id: string;
	quantity: number;
	unit_cost: number;
	notes: string;
	created_by_user_id: string;
}) {
	const client = await db.connect();

	try {
		await client.query("BEGIN");

		const receiptResult = await client.query<{ id: string }>(
			`
      INSERT INTO purchase_receipts (
        supplier_id,
        warehouse_id,
        notes,
        created_by_user_id
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id::text AS id
    `,
			[
				data.supplier_id,
				data.warehouse_id,
				data.notes,
				data.created_by_user_id,
			],
		);

		const receiptId = receiptResult.rows[0]?.id;
		if (!receiptId) {
			throw new Error("No se pudo crear el albarán de compra.");
		}

		await client.query(
			`
      INSERT INTO purchase_receipt_items (
        receipt_id,
        product_id,
        quantity,
        unit_cost
      )
      VALUES ($1, $2, $3, $4)
    `,
			[receiptId, data.product_id, data.quantity, data.unit_cost],
		);

		await createStockMovementInTransaction(client, {
			product_id: data.product_id,
			warehouse_id: data.warehouse_id,
			movement_type: "in",
			quantity: data.quantity,
			reason: `Compra proveedor (albarán ${receiptId})`,
			performed_by_user_id: data.created_by_user_id,
		});

		await client.query("COMMIT");
		return { id: receiptId };
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
}

export async function getRecentPurchaseReceipts() {
	const result = await db.query<PurchaseReceiptListItem>(
		`
    SELECT
      pr.id::text,
      s.name AS supplier_name,
      w.name AS warehouse_name,
      COALESCE(SUM(pri.quantity * pri.unit_cost), 0)::float8 AS total_amount,
      pr.created_at::text AS created_at,
      u.name AS created_by_user_name
    FROM purchase_receipts pr
    JOIN suppliers s ON s.id = pr.supplier_id
    JOIN warehouses w ON w.id = pr.warehouse_id
    JOIN users u ON u.id = pr.created_by_user_id
    LEFT JOIN purchase_receipt_items pri ON pri.receipt_id = pr.id
    GROUP BY pr.id, s.name, w.name, pr.created_at, u.name
    ORDER BY pr.created_at DESC
    LIMIT 20
  `,
	);

	return result.rows;
}
