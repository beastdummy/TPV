import { getCurrentTenantContext } from "../auth/tenant-guards.server";
import { logBusinessAuditEvent } from "./audit.server";
import { BUSINESS_AUDIT_ACTIONS } from "./types";

async function auditContext() {
	const ctx = await getCurrentTenantContext();
	if (!ctx?.business) {
		return null;
	}
	return {
		businessId: ctx.business.businessId,
		actorUserId: ctx.user.id,
		actorMemberId: ctx.business.membershipId,
	};
}

export async function auditWarehouseCreated(warehouseId: string, name: string) {
	const ctx = await auditContext();
	if (!ctx) return;
	await logBusinessAuditEvent({
		...ctx,
		action: BUSINESS_AUDIT_ACTIONS.WAREHOUSE_CREATED,
		entityType: "warehouse",
		entityId: warehouseId,
		metadata: { name },
	});
}

export async function auditCategoryCreated(categoryId: string, name: string) {
	const ctx = await auditContext();
	if (!ctx) return;
	await logBusinessAuditEvent({
		...ctx,
		action: BUSINESS_AUDIT_ACTIONS.CATEGORY_CREATED,
		entityType: "category",
		entityId: categoryId,
		metadata: { name },
	});
}

export async function auditProductCreated(productId: string, name: string) {
	const ctx = await auditContext();
	if (!ctx) return;
	await logBusinessAuditEvent({
		...ctx,
		action: BUSINESS_AUDIT_ACTIONS.PRODUCT_CREATED,
		entityType: "product",
		entityId: productId,
		metadata: { name },
	});
}

export async function auditInitialStockRecorded(receiptId: string) {
	const ctx = await auditContext();
	if (!ctx) return;
	await logBusinessAuditEvent({
		...ctx,
		action: BUSINESS_AUDIT_ACTIONS.INITIAL_STOCK_RECORDED,
		entityType: "purchase_receipt",
		entityId: receiptId,
	});
}

export async function auditInitialStockCreated(
	metadata: Record<string, unknown>,
) {
	const ctx = await auditContext();
	if (!ctx) return;
	await logBusinessAuditEvent({
		...ctx,
		action: BUSINESS_AUDIT_ACTIONS.INITIAL_STOCK_CREATED,
		entityType: "product_stock",
		entityId: String(metadata.product_id ?? ""),
		metadata,
	});
}

export async function auditInitialPurchaseCreated(
	receiptId: string,
	metadata: Record<string, unknown>,
) {
	const ctx = await auditContext();
	if (!ctx) return;
	await logBusinessAuditEvent({
		...ctx,
		action: BUSINESS_AUDIT_ACTIONS.INITIAL_PURCHASE_CREATED,
		entityType: "purchase_receipt",
		entityId: receiptId,
		metadata,
	});
}

export async function auditInventoryReviewed() {
	const ctx = await auditContext();
	if (!ctx) return;
	await logBusinessAuditEvent({
		...ctx,
		action: BUSINESS_AUDIT_ACTIONS.INVENTORY_REVIEWED,
		entityType: "business",
		entityId: ctx.businessId,
	});
}

export async function auditCashSessionOpened(sessionId: string) {
	const ctx = await auditContext();
	if (!ctx) return;
	await logBusinessAuditEvent({
		...ctx,
		action: BUSINESS_AUDIT_ACTIONS.CASH_SESSION_OPENED,
		entityType: "cash_session",
		entityId: sessionId,
	});
}

export async function auditSaleFinalized(saleId: string) {
	const ctx = await auditContext();
	if (!ctx) return;
	await logBusinessAuditEvent({
		...ctx,
		action: BUSINESS_AUDIT_ACTIONS.SALE_FINALIZED,
		entityType: "sale",
		entityId: saleId,
	});
}
