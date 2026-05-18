import { db } from "../../lib/db.server";
import type { Warehouse } from "./types";

export class OperationalWarehouseError extends Error {
	constructor(
		message: string,
		readonly code: "NO_WAREHOUSE" | "WAREHOUSE_NOT_FOUND" = "NO_WAREHOUSE",
	) {
		super(message);
		this.name = "OperationalWarehouseError";
	}
}

type WarehouseRow = Warehouse & { is_default: boolean };

export async function getWarehouseById(
	warehouseId: string,
): Promise<WarehouseRow | null> {
	const result = await db.query<WarehouseRow>(
		`
    SELECT id, name, is_active, is_default
    FROM warehouses
    WHERE id = $1
    LIMIT 1
    `,
		[warehouseId],
	);
	return result.rows[0] ?? null;
}

export async function getDefaultWarehouse(): Promise<WarehouseRow | null> {
	const result = await db.query<WarehouseRow>(
		`
    SELECT id, name, is_active, is_default
    FROM warehouses
    WHERE is_active = TRUE
      AND is_default = TRUE
    LIMIT 1
    `,
	);
	if (result.rows[0]) {
		return result.rows[0];
	}

	const fallback = await db.query<WarehouseRow>(
		`
    SELECT id, name, is_active, is_default
    FROM warehouses
    WHERE is_active = TRUE
    ORDER BY created_at ASC, name ASC
    LIMIT 1
    `,
	);
	return fallback.rows[0] ?? null;
}

export async function setDefaultWarehouse(warehouseId: string): Promise<void> {
	const existing = await getWarehouseById(warehouseId);
	if (!existing?.is_active) {
		throw new OperationalWarehouseError(
			"El almacén indicado no existe o está inactivo.",
			"WAREHOUSE_NOT_FOUND",
		);
	}

	await db.query(
		`
    UPDATE warehouses
    SET is_default = FALSE
    WHERE is_default = TRUE
      AND id <> $1
    `,
		[warehouseId],
	);

	await db.query(
		`
    UPDATE warehouses
    SET is_default = TRUE, updated_at = NOW()
    WHERE id = $1
    `,
		[warehouseId],
	);
}

export async function getBusinessOperationalWarehouseId(
	businessId: string,
): Promise<string | null> {
	const result = await db.query<{ warehouse_id: string | null }>(
		`
    SELECT settings->'setup'->>'operational_warehouse_id' AS warehouse_id
    FROM businesses
    WHERE id = $1
    `,
		[businessId],
	);
	const configured = result.rows[0]?.warehouse_id?.trim();
	return configured || null;
}

export async function setBusinessOperationalWarehouseId(
	businessId: string,
	warehouseId: string,
): Promise<void> {
	await db.query(
		`
    UPDATE businesses
    SET settings = jsonb_set(
      COALESCE(settings, '{}'::jsonb),
      '{setup,operational_warehouse_id}',
      to_jsonb($2::text),
      true
    ),
    updated_at = NOW()
    WHERE id = $1
    `,
		[businessId, warehouseId],
	);
}

/**
 * Almacén operativo del negocio: configurado en setup → is_default → primero activo.
 */
export async function resolveOperationalWarehouseForBusiness(
	businessId: string,
): Promise<WarehouseRow> {
	const configuredId = await getBusinessOperationalWarehouseId(businessId);
	if (configuredId) {
		const configured = await getWarehouseById(configuredId);
		if (configured?.is_active) {
			return configured;
		}
	}

	const defaultWarehouse = await getDefaultWarehouse();
	if (defaultWarehouse) {
		return defaultWarehouse;
	}

	throw new OperationalWarehouseError(
		"No hay ningún almacén activo. Crea un almacén en la configuración inicial.",
		"NO_WAREHOUSE",
	);
}

export async function resolveOperationalWarehouseIdForBusiness(
	businessId: string,
): Promise<string> {
	const warehouse = await resolveOperationalWarehouseForBusiness(businessId);
	return warehouse.id;
}
