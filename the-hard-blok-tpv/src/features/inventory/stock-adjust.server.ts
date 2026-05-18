import { db } from "../../lib/db.server";
import { auditInventoryAdjustment } from "./inventory-audit.server";
import {
	insertStockMovement,
	lockProductStockQuantity,
	updateProductStockQuantity,
} from "./stock-lock.server";
import {
	STOCK_ADJUSTMENT_REASON_CODES,
	type StockAdjustmentReasonCode,
} from "./stock-movement-types";

export class StockAdjustError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "StockAdjustError";
	}
}

export type StockAdjustmentType = "increase" | "decrease" | "set";

export type AdjustStockForAdminInput = {
	business_id: string;
	product_id: string;
	warehouse_id: string;
	adjustment_type: StockAdjustmentType;
	quantity: number;
	reason_code: StockAdjustmentReasonCode;
	note?: string | null;
	confirm_negative?: boolean;
	performed_by_user_id: string;
	actor_member_id?: string | null;
};

function assertReason(input: AdjustStockForAdminInput): void {
	if (!STOCK_ADJUSTMENT_REASON_CODES.includes(input.reason_code)) {
		throw new StockAdjustError("Motivo de ajuste no válido.");
	}

	if (input.reason_code === "other" && !input.note?.trim()) {
		throw new StockAdjustError(
			"La nota es obligatoria cuando el motivo es «otro».",
		);
	}
}

function computeAdjustedQuantity(
	before: number,
	adjustmentType: StockAdjustmentType,
	quantity: number,
	confirmNegative: boolean,
): { after: number; movementType: string; delta: number } {
	if (adjustmentType === "increase") {
		if (quantity <= 0) {
			throw new StockAdjustError("La cantidad debe ser mayor que cero.");
		}
		return {
			after: before + quantity,
			movementType: "adjustment_in",
			delta: quantity,
		};
	}

	if (adjustmentType === "decrease") {
		if (quantity <= 0) {
			throw new StockAdjustError("La cantidad debe ser mayor que cero.");
		}
		return {
			after: before - quantity,
			movementType: "adjustment_out",
			delta: quantity,
		};
	}

	if (quantity < 0 && !confirmNegative) {
		throw new StockAdjustError(
			"Confirma explícitamente el stock negativo para fijar esa cantidad.",
		);
	}

	return {
		after: quantity,
		movementType: "adjustment_set",
		delta: Math.abs(quantity - before),
	};
}

export async function adjustStockForAdmin(
	input: AdjustStockForAdminInput,
): Promise<{ previous_quantity: number; new_quantity: number }> {
	assertReason(input);

	const client = await db.connect();

	try {
		await client.query("BEGIN");

		const before = await lockProductStockQuantity(
			client,
			input.product_id,
			input.warehouse_id,
		);

		const { after, movementType, delta } = computeAdjustedQuantity(
			before,
			input.adjustment_type,
			input.quantity,
			input.confirm_negative === true,
		);

		await updateProductStockQuantity(
			client,
			input.product_id,
			input.warehouse_id,
			after,
		);

		const reasonLabel = `Ajuste (${input.reason_code}): ${input.adjustment_type}`;
		await insertStockMovement(client, {
			product_id: input.product_id,
			warehouse_id: input.warehouse_id,
			movement_type: movementType,
			quantity: delta,
			previous_quantity: before,
			new_quantity: after,
			reason: reasonLabel,
			reason_code: input.reason_code,
			note: input.note?.trim() || null,
			performed_by_user_id: input.performed_by_user_id,
		});

		await client.query("COMMIT");

		await auditInventoryAdjustment(
			{
				businessId: input.business_id,
				actorUserId: input.performed_by_user_id,
				actorMemberId: input.actor_member_id,
			},
			{
				productId: input.product_id,
				warehouseId: input.warehouse_id,
				adjustmentType: input.adjustment_type,
				reasonCode: input.reason_code,
				quantity: input.quantity,
				beforeQuantity: before,
				afterQuantity: after,
			},
		);

		return { previous_quantity: before, new_quantity: after };
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
}
