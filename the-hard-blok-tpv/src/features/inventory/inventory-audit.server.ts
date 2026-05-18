import { logBusinessAuditEvent } from "../business-setup/audit.server";
import type { NegativeStockSaleItem } from "./stock-movement-types";
import { INVENTORY_AUDIT_ACTIONS } from "./stock-movement-types";

export type InventoryAuditActor = {
	businessId: string;
	actorUserId: string;
	actorMemberId?: string | null;
};

export async function auditNegativeStockSale(
	actor: InventoryAuditActor,
	input: {
		saleId: string;
		warehouseId: string;
		items: NegativeStockSaleItem[];
	},
): Promise<void> {
	if (input.items.length === 0) {
		return;
	}

	await logBusinessAuditEvent({
		businessId: actor.businessId,
		actorUserId: actor.actorUserId,
		actorMemberId: actor.actorMemberId ?? null,
		action: INVENTORY_AUDIT_ACTIONS.NEGATIVE_STOCK_SALE,
		entityType: "sale",
		entityId: input.saleId,
		metadata: {
			warehouse_id: input.warehouseId,
			items: input.items,
		},
	});
}

export async function auditInventoryTransfer(
	actor: InventoryAuditActor,
	input: {
		correlationId: string;
		productId: string;
		fromWarehouseId: string;
		toWarehouseId: string;
		quantity: number;
		reasonCode: string;
		beforeFrom: number;
		afterFrom: number;
		beforeTo: number;
		afterTo: number;
	},
): Promise<void> {
	await logBusinessAuditEvent({
		businessId: actor.businessId,
		actorUserId: actor.actorUserId,
		actorMemberId: actor.actorMemberId ?? null,
		action: INVENTORY_AUDIT_ACTIONS.TRANSFER,
		entityType: "stock_transfer",
		entityId: input.correlationId,
		metadata: input,
	});
}

export async function auditInventoryAdjustment(
	actor: InventoryAuditActor,
	input: {
		productId: string;
		warehouseId: string;
		adjustmentType: string;
		reasonCode: string;
		quantity: number;
		beforeQuantity: number;
		afterQuantity: number;
	},
): Promise<void> {
	await logBusinessAuditEvent({
		businessId: actor.businessId,
		actorUserId: actor.actorUserId,
		actorMemberId: actor.actorMemberId ?? null,
		action: INVENTORY_AUDIT_ACTIONS.ADJUSTMENT,
		entityType: "stock_adjustment",
		entityId: `${input.productId}:${input.warehouseId}`,
		metadata: input,
	});
}
