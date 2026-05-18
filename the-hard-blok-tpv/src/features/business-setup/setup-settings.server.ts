import { db } from "../../lib/db.server";

/** Canonical JSON path: businesses.settings.setup.<key> */
export const SETUP_SETTINGS_FLAG_KEYS = {
	inventoryReviewed: "inventory_reviewed",
	cashConfigured: "cash_configured",
	staffStepHandled: "staff_step_handled",
	businessConfirmed: "business_confirmed",
} as const;

export type SetupSettingsFlagKey =
	(typeof SETUP_SETTINGS_FLAG_KEYS)[keyof typeof SETUP_SETTINGS_FLAG_KEYS];

export function isTruthySetupFlagValue(value: unknown): boolean {
	if (value === true || value === 1) {
		return true;
	}
	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		return normalized === "true" || normalized === "t" || normalized === "1";
	}
	return false;
}

export function readSetupBooleanFromSettings(
	settings: unknown,
	key: SetupSettingsFlagKey,
): boolean {
	if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
		return false;
	}

	const root = settings as Record<string, unknown>;
	const setup =
		root.setup && typeof root.setup === "object" && !Array.isArray(root.setup)
			? (root.setup as Record<string, unknown>)
			: null;

	if (setup && isTruthySetupFlagValue(setup[key])) {
		return true;
	}

	return isTruthySetupFlagValue(root[key]);
}

export async function readBusinessSettingsJson(
	businessId: string,
): Promise<unknown> {
	const result = await db.query<{ settings: unknown }>(
		`
    SELECT settings
    FROM businesses
    WHERE id = $1
    LIMIT 1
    `,
		[businessId],
	);
	return result.rows[0]?.settings ?? null;
}

export async function readSetupBooleanFlagForBusiness(
	businessId: string,
	key: SetupSettingsFlagKey,
): Promise<boolean> {
	const result = await db.query<{ value: boolean }>(
		`
    SELECT (
      COALESCE(settings->'setup'->$2, 'null'::jsonb) = 'true'::jsonb
      OR lower(COALESCE(settings->'setup'->>$2, '')) IN ('true', 't', '1')
      OR lower(COALESCE(settings->>$2, '')) IN ('true', 't', '1')
    ) AS value
    FROM businesses
    WHERE id = $1
    `,
		[businessId, key],
	);
	return Boolean(result.rows[0]?.value);
}

export async function writeSetupBooleanFlagForBusiness(
	businessId: string,
	key: SetupSettingsFlagKey,
	value: boolean,
): Promise<void> {
	const result = await db.query(
		`
    UPDATE businesses
    SET settings = jsonb_set(
      jsonb_set(
        COALESCE(settings, '{}'::jsonb),
        '{setup}',
        CASE
          WHEN jsonb_typeof(COALESCE(settings->'setup', '{}'::jsonb)) = 'object'
            THEN COALESCE(settings->'setup', '{}'::jsonb)
          ELSE '{}'::jsonb
        END,
        true
      ),
      ARRAY['setup', $2]::text[],
      to_jsonb($3::boolean),
      true
    ),
    updated_at = NOW()
    WHERE id = $1
    `,
		[businessId, key, value],
	);

	if ((result.rowCount ?? 0) < 1) {
		throw new Error("SETUP_BUSINESS_NOT_FOUND");
	}
}

export async function assertSetupBooleanFlagForBusiness(
	businessId: string,
	key: SetupSettingsFlagKey,
	expected: boolean,
): Promise<void> {
	const persisted = await readSetupBooleanFlagForBusiness(businessId, key);
	if (persisted !== expected) {
		throw new Error(`SETUP_FLAG_NOT_PERSISTED:${key}`);
	}

	const settings = await readBusinessSettingsJson(businessId);
	if (readSetupBooleanFromSettings(settings, key) !== expected) {
		throw new Error(`SETUP_FLAG_NOT_PERSISTED:${key}`);
	}
}
