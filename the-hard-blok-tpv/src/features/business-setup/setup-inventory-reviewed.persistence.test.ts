import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	query: vi.fn(),
	hasInitialStockRecorded: vi.fn(),
	auditInventoryReviewed: vi.fn(),
	listProductStockLinesForSetup: vi.fn(),
	getCurrentTenantContext: vi.fn(),
	isBusinessOwnerRole: vi.fn(),
}));

vi.mock("../../lib/db.server", () => ({
	db: { query: mocks.query },
}));

vi.mock("../auth/tenant-guards.server", () => ({
	getCurrentTenantContext: mocks.getCurrentTenantContext,
}));

vi.mock("../business-staff/permissions", () => ({
	isBusinessOwnerRole: mocks.isBusinessOwnerRole,
}));

vi.mock("./setup-queries.server", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("./setup-queries.server")>();
	return {
		...actual,
		hasInitialStockRecorded: mocks.hasInitialStockRecorded,
		listProductStockLinesForSetup: mocks.listProductStockLinesForSetup,
	};
});

vi.mock("./setup-wizard-actions.server", () => ({
	auditInventoryReviewed: mocks.auditInventoryReviewed,
}));

import { markInventoryReviewedStep } from "./setup-access.server";
import { SETUP_SETTINGS_FLAG_KEYS } from "./setup-settings.server";
import { getBusinessSetupState } from "./setup-state.server";

const businessId = "11111111-1111-1111-1111-111111111111";

function settingsAfterMark() {
	return { setup: { [SETUP_SETTINGS_FLAG_KEYS.inventoryReviewed]: true } };
}

describe("inventory reviewed persistence", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("markInventoryReviewedStep persists settings.setup.inventory_reviewed=true", async () => {
		mocks.getCurrentTenantContext.mockResolvedValue({
			user: { id: "user-1" },
			business: { businessId, membershipId: "mem-1" },
			role: "owner",
		});
		mocks.isBusinessOwnerRole.mockReturnValue(true);
		mocks.hasInitialStockRecorded.mockResolvedValue(true);
		mocks.auditInventoryReviewed.mockResolvedValue(undefined);
		mocks.listProductStockLinesForSetup.mockResolvedValue([]);

		let inventoryMarked = false;

		mocks.query.mockImplementation(async (sql: string) => {
			if (
				sql.includes("UPDATE businesses") &&
				sql.includes("ARRAY['setup', $2]")
			) {
				inventoryMarked = true;
				return { rowCount: 1 };
			}
			if (sql.includes("SELECT settings") && sql.includes("FROM businesses")) {
				return {
					rows: [
						{
							settings: inventoryMarked ? settingsAfterMark() : { setup: {} },
						},
					],
				};
			}
			if (sql.includes("AS value") && sql.includes("settings->'setup'")) {
				return { rows: [{ value: inventoryMarked }] };
			}
			if (sql.includes("setup_business_confirmed_at")) {
				return { rows: [{ confirmed: true }] };
			}
			if (sql.includes("FROM warehouses")) {
				return { rows: [{ count: "1" }] };
			}
			if (sql.includes("FROM categories")) {
				return { rows: [{ count: "1" }] };
			}
			if (sql.includes("FROM products")) {
				return { rows: [{ count: "1" }] };
			}
			if (sql.includes("product_stock") && sql.includes("EXISTS")) {
				return { rows: [{ exists: true }] };
			}
			if (sql.includes("cash_configured")) {
				return { rows: [{ configured: false }] };
			}
			if (sql.includes("staff_step_handled")) {
				return { rows: [{ handled: false }] };
			}
			if (sql.includes("cash_sessions")) {
				return { rows: [] };
			}
			if (sql.includes("setup_completed_at")) {
				return { rows: [{ setup_completed_at: null }] };
			}
			return { rows: [] };
		});

		const result = await markInventoryReviewedStep();

		expect(result.setup.inventoryReviewed).toBe(true);
		expect(result.setup.completedSteps).toContain("review_inventory");
		expect(result.setup.currentStep).toBe("configure_cash");
	});

	it("getBusinessSetupState returns inventoryReviewed=true after flag is stored", async () => {
		mocks.query.mockImplementation(async (sql: string) => {
			if (sql.includes("AS value") || sql.includes("AS reviewed")) {
				return { rows: [{ value: true, reviewed: true }] };
			}
			if (sql.includes("setup_business_confirmed_at")) {
				return { rows: [{ confirmed: true }] };
			}
			if (sql.includes("FROM warehouses")) {
				return { rows: [{ count: "1" }] };
			}
			if (sql.includes("FROM categories")) {
				return { rows: [{ count: "1" }] };
			}
			if (sql.includes("FROM products")) {
				return { rows: [{ count: "1" }] };
			}
			if (sql.includes("product_stock") && sql.includes("EXISTS")) {
				return { rows: [{ exists: true }] };
			}
			if (sql.includes("cash_configured")) {
				return { rows: [{ configured: false }] };
			}
			if (sql.includes("staff_step_handled")) {
				return { rows: [{ handled: false }] };
			}
			if (sql.includes("cash_sessions")) {
				return { rows: [] };
			}
			if (sql.includes("setup_completed_at")) {
				return { rows: [{ setup_completed_at: null }] };
			}
			return { rows: [] };
		});

		const state = await getBusinessSetupState(businessId);
		expect(state.inventoryReviewed).toBe(true);
		expect(state.completedSteps).toContain("review_inventory");
		expect(state.currentStep).toBe("configure_cash");
	});

	it("configure_cash remains required when inventory was not persisted", async () => {
		mocks.query.mockImplementation(async (sql: string) => {
			if (sql.includes("AS value") || sql.includes("AS reviewed")) {
				return { rows: [{ value: false, reviewed: false }] };
			}
			if (sql.includes("setup_business_confirmed_at")) {
				return { rows: [{ confirmed: true }] };
			}
			if (sql.includes("FROM warehouses")) {
				return { rows: [{ count: "1" }] };
			}
			if (sql.includes("FROM categories")) {
				return { rows: [{ count: "1" }] };
			}
			if (sql.includes("FROM products")) {
				return { rows: [{ count: "1" }] };
			}
			if (sql.includes("product_stock") && sql.includes("EXISTS")) {
				return { rows: [{ exists: true }] };
			}
			if (sql.includes("cash_configured")) {
				return { rows: [{ configured: true }] };
			}
			if (sql.includes("staff_step_handled")) {
				return { rows: [{ handled: true }] };
			}
			if (sql.includes("cash_sessions") && sql.includes("status = 'open'")) {
				return { rows: [{ exists: 1 }] };
			}
			if (sql.includes("setup_completed_at")) {
				return { rows: [{ setup_completed_at: null }] };
			}
			return { rows: [] };
		});

		const state = await getBusinessSetupState(businessId);
		expect(state.inventoryReviewed).toBe(false);
		expect(state.currentStep).toBe("review_inventory");
		expect(state.completedSteps).not.toContain("open_cash");
	});
});
