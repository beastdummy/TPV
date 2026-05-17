import { getAppUserFn } from "../auth/auth.rpc";
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
