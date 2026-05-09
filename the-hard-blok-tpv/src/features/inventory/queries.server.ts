import { db } from "../../lib/db.server";
import type { PoolClient } from "pg";

import type {
	InventoryItemRow,
	StockMovement,
	StockMovementType,
	Warehouse,
	WarehouseStockRow,
} from "./types";

export async function getWarehouses() {
	const result = await db.query<Warehouse>(
		`
    SELECT id, name, is_active
    FROM warehouses
    ORDER BY name ASC
  `,
	);

	return result.rows;
}

export async function createWarehouse(data: Warehouse) {
	await db.query(
		`
    INSERT INTO warehouses (
      id,
      name,
      is_active
    )
    VALUES ($1, $2, $3)
    `,
		[data.id, data.name, data.is_active],
	);
}

export async function getWarehouseStock(warehouseId: string) {
	const result = await db.query<WarehouseStockRow>(
		`
    SELECT
      p.id AS product_id,
      p.name AS product_name,
      $1::text AS warehouse_id,
      COALESCE(ps.quantity, 0)::float8 AS quantity
    FROM products p
    LEFT JOIN product_stock ps
      ON ps.product_id = p.id
      AND ps.warehouse_id = $1
    WHERE p.is_active = true
    ORDER BY p.sort_order ASC, p.name ASC
  `,
		[warehouseId],
	);

	return result.rows;
}

export async function setProductStock(data: {
	product_id: string;
	warehouse_id: string;
	quantity: number;
}) {
	await db.query(
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
		[data.product_id, data.warehouse_id, data.quantity],
	);
}

type CreateStockMovementInput = {
	product_id: string;
	warehouse_id: string;
	movement_type: StockMovementType;
	quantity: number;
	reason: string;
	performed_by_user_id: string;
};

function calculateNextQuantity(
	current: number,
	type: StockMovementType,
	quantity: number,
) {
	if (type === "in") {
		return current + quantity;
	}

	if (type === "out") {
		return current - quantity;
	}

	return quantity;
}

async function getCurrentStock(
	client: PoolClient,
	productId: string,
	warehouseId: string,
) {
	const currentStockResult = await client.query<{ quantity: number }>(
		`
    SELECT COALESCE(quantity, 0)::float8 AS quantity
    FROM product_stock
    WHERE product_id = $1
      AND warehouse_id = $2
    `,
		[productId, warehouseId],
	);

	return currentStockResult.rows[0]?.quantity ?? 0;
}

export async function createStockMovement(input: CreateStockMovementInput) {
	const client = await db.connect();

	try {
		await client.query("BEGIN");

		const previousQuantity = await getCurrentStock(
			client,
			input.product_id,
			input.warehouse_id,
		);
		const newQuantity = calculateNextQuantity(
			previousQuantity,
			input.movement_type,
			input.quantity,
		);

		if (newQuantity < 0) {
			throw new Error("Stock insuficiente para registrar la salida.");
		}

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
			[input.product_id, input.warehouse_id, newQuantity],
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
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
			[
				input.product_id,
				input.warehouse_id,
				input.movement_type,
				input.quantity,
				previousQuantity,
				newQuantity,
				input.reason,
				input.performed_by_user_id,
			],
		);

		await client.query("COMMIT");
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
}

export async function getWarehouseMovements(warehouseId: string) {
	const result = await db.query<StockMovement>(
		`
    SELECT
      sm.id,
      sm.product_id,
      p.name AS product_name,
      sm.warehouse_id,
      sm.movement_type,
      sm.quantity::float8 AS quantity,
      sm.previous_quantity::float8 AS previous_quantity,
      sm.new_quantity::float8 AS new_quantity,
      sm.reason,
      sm.performed_by_user_id::text AS performed_by_user_id,
      u.name AS performed_by_user_name,
      sm.created_at::text AS created_at
    FROM stock_movements sm
    JOIN products p ON p.id = sm.product_id
    JOIN users u ON u.id = sm.performed_by_user_id
    WHERE sm.warehouse_id = $1
    ORDER BY sm.created_at DESC
    LIMIT 50
  `,
		[warehouseId],
	);

	return result.rows;
}

export async function getInventoryItems() {
	const result = await db.query<InventoryItemRow>(
		`
    SELECT
      ii.id::text,
      ii.product_id,
      p.name AS product_name,
      c.name AS category_name,
      ii.warehouse_id,
      w.name AS warehouse_name,
      ii.lot_code,
      ii.serial_number,
      ii.expiry_date::text,
      ii.qty_on_hand::float8 AS qty_on_hand
    FROM inventory_items ii
    JOIN products p ON p.id = ii.product_id
    JOIN categories c ON c.id = p.category_id
    JOIN warehouses w ON w.id = ii.warehouse_id
    WHERE p.is_active = true
      AND w.is_active = true
    ORDER BY w.name ASC, p.name ASC, ii.expiry_date ASC NULLS LAST
  `,
	);

	return result.rows;
}

export async function createInventoryMovementDetailed(input: {
	product_id: string;
	warehouse_id: string;
	movement_type: StockMovementType;
	quantity: number;
	lot_code: string;
	serial_number: string;
	expiry_date: string | null;
	reason: string;
	performed_by_user_id: string;
}) {
	const lotCode = input.lot_code.trim();
	const serialNumber = input.serial_number.trim();
	const expiryDate = input.expiry_date;

	const client = await db.connect();

	try {
		await client.query("BEGIN");

		const existingResult = await client.query<{
			id: string;
			qty_on_hand: number;
		}>(
			`
      SELECT id::text, qty_on_hand::float8 AS qty_on_hand
      FROM inventory_items
      WHERE warehouse_id = $1
        AND product_id = $2
        AND lot_code = $3
        AND serial_number = $4
        AND (
          (expiry_date IS NULL AND $5::date IS NULL)
          OR expiry_date = $5::date
        )
      LIMIT 1
    `,
			[
				input.warehouse_id,
				input.product_id,
				lotCode,
				serialNumber,
				expiryDate,
			],
		);

		const currentQty = existingResult.rows[0]?.qty_on_hand ?? 0;
		let newQty = currentQty;

		if (input.movement_type === "in") {
			newQty = currentQty + input.quantity;
		} else if (input.movement_type === "out") {
			newQty = currentQty - input.quantity;
		} else {
			newQty = input.quantity;
		}

		if (newQty < 0) {
			throw new Error("Stock insuficiente para salida en ese lote/serie.");
		}

		let inventoryItemId = existingResult.rows[0]?.id;
		if (inventoryItemId) {
			await client.query(
				`
        UPDATE inventory_items
        SET qty_on_hand = $2, updated_at = NOW()
        WHERE id = $1::uuid
      `,
				[inventoryItemId, newQty],
			);
		} else {
			const inserted = await client.query<{ id: string }>(
				`
        INSERT INTO inventory_items (
          product_id,
          warehouse_id,
          lot_code,
          serial_number,
          expiry_date,
          qty_on_hand
        )
        VALUES ($1, $2, $3, $4, $5::date, $6)
        RETURNING id::text
      `,
				[
					input.product_id,
					input.warehouse_id,
					lotCode,
					serialNumber,
					expiryDate,
					newQty,
				],
			);
			inventoryItemId = inserted.rows[0]?.id;
		}

		if (!inventoryItemId) {
			throw new Error("No se pudo crear/actualizar el item de inventario.");
		}

		await client.query(
			`
      INSERT INTO inventory_item_movements (
        inventory_item_id,
        product_id,
        warehouse_id,
        movement_type,
        quantity,
        reason,
        performed_by_user_id
      )
      VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::uuid)
    `,
			[
				inventoryItemId,
				input.product_id,
				input.warehouse_id,
				input.movement_type,
				input.quantity,
				input.reason,
				input.performed_by_user_id,
			],
		);

		const previousWarehouseStockResult = await client.query<{ quantity: number }>(
			`
      SELECT COALESCE(quantity, 0)::float8 AS quantity
      FROM product_stock
      WHERE product_id = $1
        AND warehouse_id = $2
    `,
			[input.product_id, input.warehouse_id],
		);

		const previousWarehouseStock =
			previousWarehouseStockResult.rows[0]?.quantity ?? 0;

		const aggregatedResult = await client.query<{ total: number }>(
			`
      SELECT COALESCE(SUM(qty_on_hand), 0)::float8 AS total
      FROM inventory_items
      WHERE product_id = $1
        AND warehouse_id = $2
    `,
			[input.product_id, input.warehouse_id],
		);
		const aggregatedStock = aggregatedResult.rows[0]?.total ?? 0;

		await client.query(
			`
      INSERT INTO product_stock (product_id, warehouse_id, quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT (product_id, warehouse_id)
      DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW()
    `,
			[input.product_id, input.warehouse_id, aggregatedStock],
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
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::uuid)
    `,
			[
				input.product_id,
				input.warehouse_id,
				input.movement_type,
				input.quantity,
				previousWarehouseStock,
				aggregatedStock,
				input.reason,
				input.performed_by_user_id,
			],
		);

		await client.query("COMMIT");
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
}
