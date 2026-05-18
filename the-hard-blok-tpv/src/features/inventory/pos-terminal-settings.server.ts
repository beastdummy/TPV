import { db } from "../../lib/db.server";

export async function getTerminalWarehouseId(
	businessId: string,
	terminalId: string,
): Promise<string | null> {
	const result = await db.query<{ warehouse_id: string }>(
		`
    SELECT warehouse_id
    FROM pos_terminal_settings
    WHERE business_id = $1
      AND terminal_id = $2
    LIMIT 1
    `,
		[businessId, terminalId],
	);

	return result.rows[0]?.warehouse_id ?? null;
}

export async function setTerminalWarehouseId(
	businessId: string,
	terminalId: string,
	warehouseId: string,
): Promise<void> {
	await db.query(
		`
    INSERT INTO pos_terminal_settings (
      business_id,
      terminal_id,
      warehouse_id,
      updated_at
    )
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (business_id, terminal_id)
    DO UPDATE SET
      warehouse_id = EXCLUDED.warehouse_id,
      updated_at = NOW()
    `,
		[businessId, terminalId, warehouseId],
	);
}
