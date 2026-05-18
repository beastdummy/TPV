import { getCurrentTenantContext } from "../auth/tenant-guards.server";
import {
	OperationalWarehouseError,
	resolveOperationalWarehouseForBusiness,
} from "./operational-warehouse.server";

export type OperationalWarehouseContext = {
	id: string;
	name: string;
};

export async function loadOperationalWarehouseForPos(): Promise<OperationalWarehouseContext> {
	const ctx = await getCurrentTenantContext();
	if (!ctx?.business) {
		throw new OperationalWarehouseError(
			"No se encontró el negocio activo.",
			"NO_WAREHOUSE",
		);
	}

	const warehouse = await resolveOperationalWarehouseForBusiness(
		ctx.business.businessId,
	);
	return { id: warehouse.id, name: warehouse.name };
}
