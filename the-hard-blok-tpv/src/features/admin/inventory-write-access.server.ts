import { getAppUserFn } from "../auth/auth.rpc";
import { getCurrentTenantContext } from "../auth/tenant-guards.server";
import type { StockAdjustmentReasonCode } from "../inventory/stock-movement-types";
import type { TransferStockBetweenWarehousesInput } from "../inventory/stock-transfer.server";
import type { StockMovementType } from "../inventory/types";
import { ensureCatalogManagementBusinessRole } from "./products-access.server";

async function requireCatalogManagementActor() {
	await ensureCatalogManagementBusinessRole();
	const user = await getAppUserFn();

	if (!user) {
		throw new Error("UNAUTHORIZED");
	}

	return user;
}

export type SetProductStockForAdminInput = {
	product_id: string;
	warehouse_id: string;
	quantity: number;
};

export type CreateStockMovementForAdminInput = {
	product_id: string;
	warehouse_id: string;
	movement_type: StockMovementType;
	quantity: number;
	reason: string;
};

export type CreateInventoryMovementDetailedForAdminInput = {
	product_id: string;
	warehouse_id: string;
	movement_type: StockMovementType;
	quantity: number;
	lot_code: string;
	serial_number: string;
	expiry_date: string | null;
	reason: string;
};

export async function setProductStockForAdmin(
	data: SetProductStockForAdminInput,
) {
	await ensureCatalogManagementBusinessRole();
	const { setProductStock } = await import("../inventory/queries.server");
	await setProductStock(data);
	return { ok: true as const };
}

export async function createStockMovementForAdmin(
	data: CreateStockMovementForAdminInput,
) {
	const user = await requireCatalogManagementActor();
	const { createStockMovement } = await import("../inventory/queries.server");
	await createStockMovement({
		...data,
		performed_by_user_id: user.id,
	});
	return { ok: true as const };
}

export async function createInventoryMovementDetailedForAdmin(
	data: CreateInventoryMovementDetailedForAdminInput,
) {
	const user = await requireCatalogManagementActor();
	const { createInventoryMovementDetailed } = await import(
		"../inventory/queries.server"
	);
	await createInventoryMovementDetailed({
		...data,
		performed_by_user_id: user.id,
	});
	return { ok: true as const };
}

export type TransferStockForAdminInput = Omit<
	TransferStockBetweenWarehousesInput,
	"business_id" | "performed_by_user_id" | "actor_member_id"
>;

export type AdjustStockForAdminRpcInput = {
	product_id: string;
	warehouse_id: string;
	adjustment_type: StockAdjustmentType;
	quantity: number;
	reason_code: StockAdjustmentReasonCode;
	note?: string | null;
	confirm_negative?: boolean;
};

export async function transferStockBetweenWarehousesForAdmin(
	data: TransferStockForAdminInput,
) {
	const user = await requireCatalogManagementActor();
	const ctx = await getCurrentTenantContext();
	if (!ctx?.business) {
		throw new Error("UNAUTHORIZED");
	}

	const { transferStockBetweenWarehousesForAdmin: transfer } = await import(
		"../inventory/stock-transfer.server"
	);

	return await transfer({
		...data,
		business_id: ctx.business.businessId,
		performed_by_user_id: user.id,
	});
}

export async function adjustStockForAdmin(data: AdjustStockForAdminRpcInput) {
	const user = await requireCatalogManagementActor();
	const ctx = await getCurrentTenantContext();
	if (!ctx?.business) {
		throw new Error("UNAUTHORIZED");
	}

	const { adjustStockForAdmin: adjust } = await import(
		"../inventory/stock-adjust.server"
	);

	return await adjust({
		...data,
		business_id: ctx.business.businessId,
		performed_by_user_id: user.id,
	});
}

export async function updateProductStockMinimumsForAdmin(data: {
	product_id: string;
	warehouse_id: string;
	minimum_quantity: number;
	reorder_quantity: number;
}) {
	await ensureCatalogManagementBusinessRole();
	const { updateProductStockMinimums } = await import(
		"../inventory/replenishment.server"
	);
	await updateProductStockMinimums(data);
	return { ok: true as const };
}
