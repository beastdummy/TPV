import type { CategoryForAdminInput } from "../admin/categories-access.server";
import { createCategoryForAdmin } from "../admin/categories-access.server";
import type { CreateProductForAdminInput } from "../admin/products-access.server";
import { createProductForAdmin } from "../admin/products-access.server";
import { createSupplierForAdmin } from "../admin/purchases-write-access.server";
import type { WarehouseForAdminInput } from "../admin/warehouses-access.server";
import { createWarehouseForAdmin } from "../admin/warehouses-access.server";
import {
	resolveOperationalWarehouseIdForBusiness,
	setBusinessOperationalWarehouseId,
	setDefaultWarehouse,
} from "../inventory/operational-warehouse.server";
import { openCashSessionForPos } from "../sales/cash-session-access.server";
import {
	auditCashSessionOpened,
	auditCategoryCreated,
	auditInitialPurchaseCreated,
	auditInitialStockCreated,
	auditInventoryReviewed,
	auditProductCreated,
	auditWarehouseCreated,
} from "./setup-audit-hooks.server";
import { recordSetupInitialStock } from "./setup-initial-stock.server";
import type { SetupInitialStockReason } from "./types";

export async function setupCreateWarehouse(
	data: WarehouseForAdminInput,
	businessId: string,
) {
	const { countActiveWarehouses } = await import("./setup-queries.server");
	const existingCount = await countActiveWarehouses();

	if (existingCount > 0) {
		const { getWarehouses } = await import("../inventory/queries.server");
		const warehouses = await getWarehouses();
		const duplicate = warehouses.find((w) => w.id === data.id);
		if (duplicate) {
			throw new Error("Ya existe un almacén con ese identificador.");
		}
	}

	const isFirst = existingCount === 0;
	await createWarehouseForAdmin({
		...data,
		is_default: isFirst,
	});

	if (isFirst) {
		await setDefaultWarehouse(data.id);
		await setBusinessOperationalWarehouseId(businessId, data.id);
	}

	await auditWarehouseCreated(data.id, data.name);

	return {
		ok: true as const,
		warehouseId: data.id,
		warehouseName: data.name,
		isOperational: isFirst,
	};
}

export async function setupSetOperationalWarehouse(
	businessId: string,
	warehouseId: string,
) {
	const warehouse = await import(
		"../inventory/operational-warehouse.server"
	).then((m) => m.getWarehouseById(warehouseId));
	if (!warehouse?.is_active) {
		throw new Error("El almacén indicado no existe o está inactivo.");
	}

	await setDefaultWarehouse(warehouseId);
	await setBusinessOperationalWarehouseId(businessId, warehouseId);

	return {
		ok: true as const,
		warehouseId,
		warehouseName: warehouse.name,
	};
}

export async function setupCreateCategory(data: CategoryForAdminInput) {
	await createCategoryForAdmin(data);
	await auditCategoryCreated(data.id, data.name);
	return { ok: true as const };
}

export async function setupCreateProduct(
	data: CreateProductForAdminInput,
	businessId: string,
) {
	const operationalWarehouseId =
		await resolveOperationalWarehouseIdForBusiness(businessId);

	const result = await createProductForAdmin({
		...data,
		warehouse: operationalWarehouseId,
	});
	await auditProductCreated(result.productId, data.name);
	return {
		ok: true as const,
		warehouseId: operationalWarehouseId,
		productId: result.productId,
	};
}

export type SetupCreateInitialStockInput = {
	product_id: string;
	quantity: number;
	unit_cost?: number;
	supplier_id?: string | null;
	reason?: SetupInitialStockReason;
	notes?: string;
};

export async function setupCreateInitialStock(
	data: SetupCreateInitialStockInput,
	businessId: string,
) {
	const operationalWarehouseId =
		await resolveOperationalWarehouseIdForBusiness(businessId);
	const reason = data.reason ?? "initial_stock";

	const result = await recordSetupInitialStock({
		product_id: data.product_id,
		warehouse_id: operationalWarehouseId,
		quantity: data.quantity,
		unit_cost: data.unit_cost ?? 0,
		supplier_id: data.supplier_id ?? null,
		reason,
		notes: data.notes?.trim() ?? "",
	});

	if (result.receipt_id) {
		await auditInitialPurchaseCreated(result.receipt_id, {
			product_id: data.product_id,
			warehouse_id: operationalWarehouseId,
			quantity: data.quantity,
			reason,
		});
	} else {
		await auditInitialStockCreated({
			product_id: data.product_id,
			warehouse_id: operationalWarehouseId,
			quantity: data.quantity,
			reason,
			movement_type: result.movement_type,
		});
	}

	return { ...result, warehouseId: operationalWarehouseId };
}

export async function setupCreateDefaultSupplier(name: string) {
	return await createSupplierForAdmin({
		name: name.trim() || "Proveedor inicial",
		tax_id: "",
		email: "",
		phone: "",
	});
}

export async function setupOpenCashSession(
	businessId: string,
	openingFloat = 0,
) {
	const { getCashOpeningFloatForBusiness } = await import(
		"./setup-queries.server"
	);
	const configuredFloat = await getCashOpeningFloatForBusiness(businessId);
	const floatToUse =
		openingFloat > 0 || configuredFloat === 0 ? openingFloat : configuredFloat;

	const session = await openCashSessionForPos({
		terminal_id: "default",
		opening_float: floatToUse,
		notes: "Apertura desde configuración inicial",
	});
	await auditCashSessionOpened(session.id);
	return session;
}

export { auditInventoryReviewed };
