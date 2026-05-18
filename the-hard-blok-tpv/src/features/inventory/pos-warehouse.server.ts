import { getCurrentTenantContext } from "../auth/tenant-guards.server";
import { hasBusinessPermission } from "../business-staff/business-permissions.server";
import { isBusinessOwnerRole } from "../business-staff/permissions";
import { resolveOperationalWarehouseForBusiness } from "./operational-warehouse.server";
import {
	getTerminalWarehouseId,
	setTerminalWarehouseId,
} from "./pos-terminal-settings.server";
import { getWarehouses } from "./queries.server";

export const SALES_CHANGE_WAREHOUSE_PERMISSION = "sales.change_warehouse";

export type PosWarehouseContext = {
	id: string;
	name: string;
	canChangeWarehouse: boolean;
	warehouses: { id: string; name: string }[];
};

export async function resolvePosWarehouseContext(
	terminalId: string,
): Promise<PosWarehouseContext> {
	const ctx = await getCurrentTenantContext();
	if (!ctx?.business) {
		throw new Error("No se encontró el negocio activo.");
	}

	const businessId = ctx.business.businessId;
	const warehouses = (await getWarehouses())
		.filter((warehouse) => warehouse.is_active)
		.map((warehouse) => ({ id: warehouse.id, name: warehouse.name }));

	const terminalWarehouseId = await getTerminalWarehouseId(
		businessId,
		terminalId,
	);
	const operational = await resolveOperationalWarehouseForBusiness(businessId);
	const selectedId = terminalWarehouseId ?? operational.id;
	const selected = warehouses.find(
		(warehouse) => warehouse.id === selectedId,
	) ?? { id: operational.id, name: operational.name };

	const canChangeWarehouse =
		isBusinessOwnerRole(ctx.role) ||
		(await hasBusinessPermission(SALES_CHANGE_WAREHOUSE_PERMISSION));

	return {
		id: selected.id,
		name: selected.name,
		canChangeWarehouse,
		warehouses,
	};
}

export async function savePosTerminalWarehouse(
	terminalId: string,
	warehouseId: string,
): Promise<void> {
	const ctx = await getCurrentTenantContext();
	if (!ctx?.business) {
		throw new Error("No se encontró el negocio activo.");
	}

	const canChange =
		isBusinessOwnerRole(ctx.role) ||
		(await hasBusinessPermission(SALES_CHANGE_WAREHOUSE_PERMISSION));

	if (!canChange) {
		throw new Error("No tienes permiso para cambiar el almacén de venta.");
	}

	await setTerminalWarehouseId(
		ctx.business.businessId,
		terminalId,
		warehouseId,
	);
}
