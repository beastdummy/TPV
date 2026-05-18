import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import { db } from "../../lib/db.server";
import { auditInventoryTransfer } from "./inventory-audit.server";
import {
	insertStockMovement,
	lockProductStockQuantity,
	updateProductStockQuantity,
} from "./stock-lock.server";

export class StockTransferError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "StockTransferError";
	}
}

export type TransferStockBetweenWarehousesInput = {
	business_id: string;
	product_id: string;
	from_warehouse_id: string;
	to_warehouse_id: string;
	quantity: number;
	reason_code: string;
	note?: string | null;
	performed_by_user_id: string;
	actor_member_id?: string | null;
};

export async function transferStockBetweenWarehousesForAdmin(
	input: TransferStockBetweenWarehousesInput,
): Promise<{ correlation_id: string }> {
	if (input.from_warehouse_id === input.to_warehouse_id) {
		throw new StockTransferError(
			"El almacén de origen y destino no pueden ser el mismo.",
		);
	}

	if (input.quantity <= 0) {
		throw new StockTransferError("La cantidad debe ser mayor que cero.");
	}

	const reason = input.reason_code.trim();
	if (!reason) {
		throw new StockTransferError("El motivo es obligatorio.");
	}

	const correlationId = randomUUID();
	const client = await db.connect();

	try {
		await client.query("BEGIN");

		const [fromBefore, toBefore] = await lockWarehousesForTransfer(
			client,
			input.product_id,
			input.from_warehouse_id,
			input.to_warehouse_id,
		);

		const fromAfter = fromBefore - input.quantity;
		const toAfter = toBefore + input.quantity;

		await updateProductStockQuantity(
			client,
			input.product_id,
			input.from_warehouse_id,
			fromAfter,
		);
		await updateProductStockQuantity(
			client,
			input.product_id,
			input.to_warehouse_id,
			toAfter,
		);

		const reasonLabel = `Transferencia: ${reason}`;
		const movementBase = {
			product_id: input.product_id,
			quantity: input.quantity,
			reason: reasonLabel,
			reason_code: reason,
			note: input.note?.trim() || null,
			correlation_id: correlationId,
			performed_by_user_id: input.performed_by_user_id,
		};

		await insertStockMovement(client, {
			...movementBase,
			warehouse_id: input.from_warehouse_id,
			movement_type: "transfer_out",
			previous_quantity: fromBefore,
			new_quantity: fromAfter,
		});

		await insertStockMovement(client, {
			...movementBase,
			warehouse_id: input.to_warehouse_id,
			movement_type: "transfer_in",
			previous_quantity: toBefore,
			new_quantity: toAfter,
		});

		await client.query("COMMIT");

		await auditInventoryTransfer(
			{
				businessId: input.business_id,
				actorUserId: input.performed_by_user_id,
				actorMemberId: input.actor_member_id,
			},
			{
				correlationId,
				productId: input.product_id,
				fromWarehouseId: input.from_warehouse_id,
				toWarehouseId: input.to_warehouse_id,
				quantity: input.quantity,
				reasonCode: reason,
				beforeFrom: fromBefore,
				afterFrom: fromAfter,
				beforeTo: toBefore,
				afterTo: toAfter,
			},
		);

		return { correlation_id: correlationId };
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
}

async function lockWarehousesForTransfer(
	client: PoolClient,
	productId: string,
	fromWarehouseId: string,
	toWarehouseId: string,
): Promise<[number, number]> {
	const [firstId, secondId] =
		fromWarehouseId < toWarehouseId
			? [fromWarehouseId, toWarehouseId]
			: [toWarehouseId, fromWarehouseId];

	const firstQty = await lockProductStockQuantity(client, productId, firstId);
	const secondQty = await lockProductStockQuantity(client, productId, secondId);

	if (firstId === fromWarehouseId) {
		return [firstQty, secondQty];
	}

	return [secondQty, firstQty];
}
