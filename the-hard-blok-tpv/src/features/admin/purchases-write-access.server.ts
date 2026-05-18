import { getAppUserFn } from "../auth/auth.rpc";
import {
	createPurchaseReceipt,
	createSupplier,
} from "../purchases/queries.server";
import type { Supplier } from "../purchases/types";
import { ensureCatalogManagementBusinessRole } from "./products-access.server";

async function requireCatalogManagementActor() {
	await ensureCatalogManagementBusinessRole();
	const user = await getAppUserFn();

	if (!user) {
		throw new Error("UNAUTHORIZED");
	}

	return user;
}

export type CreateSupplierForAdminInput = Omit<Supplier, "id" | "is_active">;

export type CreatePurchaseReceiptForAdminInput = {
	supplier_id: string;
	warehouse_id: string;
	product_id: string;
	quantity: number;
	unit_cost: number;
	notes: string;
};

export async function createSupplierForAdmin(
	data: CreateSupplierForAdminInput,
) {
	await ensureCatalogManagementBusinessRole();
	const supplierId = await createSupplier(data);
	return { ok: true as const, supplierId };
}

export async function createPurchaseReceiptForAdmin(
	data: CreatePurchaseReceiptForAdminInput,
) {
	const user = await requireCatalogManagementActor();
	return await createPurchaseReceipt({
		...data,
		created_by_user_id: user.id,
	});
}
