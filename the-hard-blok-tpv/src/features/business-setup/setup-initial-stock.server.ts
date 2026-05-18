import type { PoolClient } from "pg";

import { getAppUserFn } from "../auth/auth.rpc";
import {
	insertStockMovement,
	lockProductStockQuantity,
} from "../inventory/stock-lock.server";
import { createPurchaseReceipt } from "../purchases/queries.server";
import type { SetupInitialStockReason } from "./types";

export type RecordSetupInitialStockInput = {
	product_id: string;
	warehouse_id: string;
	quantity: number;
	unit_cost: number;
	supplier_id: string | null;
	reason: SetupInitialStockReason;
	notes: string;
};

async function recordDirectInitialStock(
	client: PoolClient,
	input: RecordSetupInitialStockInput & { performed_by_user_id: string },
): Promise<void> {
	const previousQuantity = await lockProductStockQuantity(
		client,
		input.product_id,
		input.warehouse_id,
	);
	const newQuantity = previousQuantity + input.quantity;
	const movementType = input.reason === "initial_purchase" ? "purchase" : "in";

	await client.query(
		`
    INSERT INTO product_stock (product_id, warehouse_id, quantity)
    VALUES ($1, $2, $3)
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW()
    `,
		[input.product_id, input.warehouse_id, newQuantity],
	);

	await insertStockMovement(client, {
		product_id: input.product_id,
		warehouse_id: input.warehouse_id,
		movement_type: movementType,
		quantity: input.quantity,
		previous_quantity: previousQuantity,
		new_quantity: newQuantity,
		reason: input.notes.trim() || `Entrada inicial (${input.reason})`,
		reason_code: input.reason,
		performed_by_user_id: input.performed_by_user_id,
	});
}

export async function recordSetupInitialStock(
	input: RecordSetupInitialStockInput,
): Promise<{ receipt_id: string | null; movement_type: string }> {
	if (input.quantity <= 0) {
		throw new Error("La cantidad debe ser mayor que cero.");
	}

	const user = await getAppUserFn();
	if (!user) {
		throw new Error("UNAUTHORIZED");
	}

	if (input.supplier_id) {
		const receipt = await createPurchaseReceipt({
			supplier_id: input.supplier_id,
			warehouse_id: input.warehouse_id,
			product_id: input.product_id,
			quantity: input.quantity,
			unit_cost: input.unit_cost,
			notes: input.notes.trim() || `Compra inicial (${input.reason})`,
			created_by_user_id: user.id,
			movement_type: "purchase",
			reason_code: input.reason,
		});

		return { receipt_id: receipt.id, movement_type: "purchase" };
	}

	const { db } = await import("../../lib/db.server");
	const client = await db.connect();

	try {
		await client.query("BEGIN");
		await recordDirectInitialStock(client, {
			...input,
			performed_by_user_id: user.id,
		});
		await client.query("COMMIT");
		return {
			receipt_id: null,
			movement_type: input.reason === "initial_purchase" ? "purchase" : "in",
		};
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
}
