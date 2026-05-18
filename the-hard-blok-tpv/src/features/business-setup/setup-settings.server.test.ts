import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	query: vi.fn(),
}));

vi.mock("../../lib/db.server", () => ({
	db: { query: mocks.query },
}));

import {
	assertSetupBooleanFlagForBusiness,
	isTruthySetupFlagValue,
	readBusinessSettingsJson,
	readSetupBooleanFlagForBusiness,
	readSetupBooleanFromSettings,
	SETUP_SETTINGS_FLAG_KEYS,
	writeSetupBooleanFlagForBusiness,
} from "./setup-settings.server";

describe("setup settings flags", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("isTruthySetupFlagValue accepts boolean and string forms", () => {
		expect(isTruthySetupFlagValue(true)).toBe(true);
		expect(isTruthySetupFlagValue("true")).toBe(true);
		expect(isTruthySetupFlagValue("1")).toBe(true);
		expect(isTruthySetupFlagValue(false)).toBe(false);
		expect(isTruthySetupFlagValue("false")).toBe(false);
	});

	it("readSetupBooleanFromSettings reads settings.setup.inventory_reviewed", () => {
		expect(
			readSetupBooleanFromSettings(
				{ setup: { inventory_reviewed: true } },
				SETUP_SETTINGS_FLAG_KEYS.inventoryReviewed,
			),
		).toBe(true);
		expect(
			readSetupBooleanFromSettings(
				{ setup: { inventory_reviewed: "true" } },
				SETUP_SETTINGS_FLAG_KEYS.inventoryReviewed,
			),
		).toBe(true);
	});

	it("writeSetupBooleanFlagForBusiness updates nested setup object", async () => {
		mocks.query.mockResolvedValueOnce({ rowCount: 1 });

		await writeSetupBooleanFlagForBusiness(
			"biz-1",
			SETUP_SETTINGS_FLAG_KEYS.inventoryReviewed,
			true,
		);

		expect(mocks.query.mock.calls[0]?.[0]).toContain("ARRAY['setup', $2]");
		expect(mocks.query.mock.calls[0]?.[1]).toEqual([
			"biz-1",
			SETUP_SETTINGS_FLAG_KEYS.inventoryReviewed,
			true,
		]);
		expect(mocks.query.mock.calls[0]?.[0]).toContain("to_jsonb($3::boolean)");
	});

	it("readSetupBooleanFlagForBusiness queries canonical path", async () => {
		mocks.query.mockResolvedValueOnce({ rows: [{ value: true }] });

		await expect(
			readSetupBooleanFlagForBusiness(
				"biz-1",
				SETUP_SETTINGS_FLAG_KEYS.inventoryReviewed,
			),
		).resolves.toBe(true);
	});

	it("assertSetupBooleanFlagForBusiness throws when flag is missing", async () => {
		mocks.query
			.mockResolvedValueOnce({ rows: [{ value: false }] })
			.mockResolvedValueOnce({ rows: [{ settings: { setup: {} } }] });

		await expect(
			assertSetupBooleanFlagForBusiness(
				"biz-1",
				SETUP_SETTINGS_FLAG_KEYS.inventoryReviewed,
				true,
			),
		).rejects.toThrow("SETUP_FLAG_NOT_PERSISTED:inventory_reviewed");
	});

	it("readBusinessSettingsJson returns settings document", async () => {
		mocks.query.mockReset();
		mocks.query.mockResolvedValue({
			rows: [{ settings: { setup: { inventory_reviewed: true } } }],
		});

		await expect(readBusinessSettingsJson("biz-1")).resolves.toEqual({
			setup: { inventory_reviewed: true },
		});
	});
});
