import { db } from "../../lib/db.server";
import type {
	ReplenishmentRow,
	ReplenishmentStatus,
} from "./stock-movement-types";

function computeReplenishmentStatus(
	current: number,
	minimum: number,
): ReplenishmentStatus {
	if (current >= minimum) {
		return "OK";
	}
	if (current < 0) {
		return current < minimum / 2 ? "Urgente" : "Negativo";
	}
	return "Bajo";
}

function computeShortage(current: number, minimum: number): number {
	return Math.max(0, minimum - current);
}

function computeSuggestedReorder(
	shortage: number,
	reorderQuantity: number,
): number {
	if (reorderQuantity > 0) {
		return Math.max(reorderQuantity, shortage);
	}
	return shortage;
}

export async function getReplenishmentListForAdmin(
	warehouseId?: string,
): Promise<ReplenishmentRow[]> {
	const result = await db.query<{
		product_id: string;
		product_name: string;
		warehouse_id: string;
		warehouse_name: string;
		current_quantity: number;
		sold_today: number;
		minimum_quantity: number;
		reorder_quantity: number;
	}>(
		`
    SELECT
      ps.product_id::text,
      p.name AS product_name,
      ps.warehouse_id,
      w.name AS warehouse_name,
      ps.quantity::float8 AS current_quantity,
      COALESCE(sold.today_qty, 0)::float8 AS sold_today,
      COALESCE(ps.minimum_quantity, 0)::float8 AS minimum_quantity,
      COALESCE(ps.reorder_quantity, 0)::float8 AS reorder_quantity
    FROM product_stock ps
    JOIN products p ON p.id = ps.product_id
    JOIN warehouses w ON w.id = ps.warehouse_id
    LEFT JOIN (
      SELECT
        sm.product_id,
        sm.warehouse_id,
        SUM(sm.quantity)::float8 AS today_qty
      FROM stock_movements sm
      WHERE sm.movement_type IN ('sale', 'out')
        AND sm.created_at >= date_trunc('day', NOW())
      GROUP BY sm.product_id, sm.warehouse_id
    ) sold
      ON sold.product_id = ps.product_id
      AND sold.warehouse_id = ps.warehouse_id
    WHERE p.is_active = TRUE
      AND w.is_active = TRUE
      AND ($1::text IS NULL OR ps.warehouse_id = $1)
    ORDER BY
      CASE
        WHEN ps.quantity < 0 THEN 0
        WHEN ps.quantity < COALESCE(ps.minimum_quantity, 0) THEN 1
        ELSE 2
      END,
      ps.quantity ASC,
      p.name ASC
    `,
		[warehouseId ?? null],
	);

	return result.rows.map((row) => {
		const shortage = computeShortage(
			row.current_quantity,
			row.minimum_quantity,
		);
		const status = computeReplenishmentStatus(
			row.current_quantity,
			row.minimum_quantity,
		);

		return {
			product_id: row.product_id,
			product_name: row.product_name,
			warehouse_id: row.warehouse_id,
			warehouse_name: row.warehouse_name,
			current_quantity: row.current_quantity,
			sold_today: row.sold_today,
			minimum_quantity: row.minimum_quantity,
			reorder_quantity: row.reorder_quantity,
			shortage,
			suggested_reorder: computeSuggestedReorder(
				shortage,
				row.reorder_quantity,
			),
			status,
		};
	});
}

export async function updateProductStockMinimums(data: {
	product_id: string;
	warehouse_id: string;
	minimum_quantity: number;
	reorder_quantity: number;
}): Promise<void> {
	await db.query(
		`
    INSERT INTO product_stock (
      product_id,
      warehouse_id,
      quantity,
      minimum_quantity,
      reorder_quantity
    )
    VALUES ($1, $2, 0, $3, $4)
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET
      minimum_quantity = EXCLUDED.minimum_quantity,
      reorder_quantity = EXCLUDED.reorder_quantity,
      updated_at = NOW()
    `,
		[
			data.product_id,
			data.warehouse_id,
			data.minimum_quantity,
			data.reorder_quantity,
		],
	);
}
