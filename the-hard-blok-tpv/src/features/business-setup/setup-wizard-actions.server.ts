import type { CategoryForAdminInput } from "../admin/categories-access.server";
import { createCategoryForAdmin } from "../admin/categories-access.server";
import type { CreateProductForAdminInput } from "../admin/products-access.server";
import { createProductForAdmin } from "../admin/products-access.server";
import type { CreatePurchaseReceiptForAdminInput } from "../admin/purchases-write-access.server";
import {
	createPurchaseReceiptForAdmin,
	createSupplierForAdmin,
} from "../admin/purchases-write-access.server";
import type { WarehouseForAdminInput } from "../admin/warehouses-access.server";
import { createWarehouseForAdmin } from "../admin/warehouses-access.server";
import { openCashSessionForPos } from "../sales/cash-session-access.server";
import {
	auditCashSessionOpened,
	auditCategoryCreated,
	auditInitialStockRecorded,
	auditProductCreated,
	auditWarehouseCreated,
} from "./setup-audit-hooks.server";

export async function setupCreateWarehouse(data: WarehouseForAdminInput) {
	await createWarehouseForAdmin(data);
	await auditWarehouseCreated(data.id, data.name);
	return { ok: true as const };
}

export async function setupCreateCategory(data: CategoryForAdminInput) {
	await createCategoryForAdmin(data);
	await auditCategoryCreated(data.id, data.name);
	return { ok: true as const };
}

export async function setupCreateProduct(data: CreateProductForAdminInput) {
	await createProductForAdmin(data);
	await auditProductCreated(data.category_id, data.name);
	return { ok: true as const };
}

export async function setupCreateInitialStock(
	data: CreatePurchaseReceiptForAdminInput,
) {
	const result = await createPurchaseReceiptForAdmin(data);
	await auditInitialStockRecorded(result.id);
	return result;
}

export async function setupCreateDefaultSupplier(name: string) {
	return await createSupplierForAdmin({
		name: name.trim() || "Proveedor inicial",
		tax_id: "",
		email: "",
		phone: "",
	});
}

export async function setupOpenCashSession(openingFloat = 0) {
	const session = await openCashSessionForPos({
		terminal_id: "default",
		opening_float: openingFloat,
		notes: "Apertura desde configuración inicial",
	});
	await auditCashSessionOpened(session.id);
	return session;
}
