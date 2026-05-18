import { describe, expect, it } from "vitest";
import type { BusinessSetupState } from "./types";
import { getVisibleBusinessModules } from "./visible-modules";

function baseState(
	overrides: Partial<BusinessSetupState> = {},
): BusinessSetupState {
	return {
		hasWarehouse: false,
		hasCategory: false,
		hasProduct: false,
		hasInitialStock: false,
		hasCashSession: false,
		hasOpenCashSession: false,
		canAccessSales: false,
		setupCompleted: false,
		currentStep: "confirm_business",
		completedSteps: [],
		...overrides,
	};
}

describe("getVisibleBusinessModules", () => {
	it("shows audit and warehouses from the start", () => {
		const visible = getVisibleBusinessModules({
			setup: baseState(),
			hasEmployees: false,
		});
		expect(visible.audit).toBe(true);
		expect(visible.warehouses).toBe(true);
		expect(visible.categories).toBe(false);
	});

	it("unlocks categories after warehouse exists", () => {
		const visible = getVisibleBusinessModules({
			setup: baseState({ hasWarehouse: true }),
			hasEmployees: false,
		});
		expect(visible.categories).toBe(true);
		expect(visible.products).toBe(false);
	});

	it("unlocks products after category exists", () => {
		const visible = getVisibleBusinessModules({
			setup: baseState({ hasWarehouse: true, hasCategory: true }),
			hasEmployees: false,
		});
		expect(visible.products).toBe(true);
		expect(visible.purchases).toBe(false);
	});

	it("unlocks purchases after product and warehouse", () => {
		const visible = getVisibleBusinessModules({
			setup: baseState({
				hasWarehouse: true,
				hasCategory: true,
				hasProduct: true,
			}),
			hasEmployees: false,
		});
		expect(visible.purchases).toBe(true);
		expect(visible.inventory).toBe(false);
	});

	it("unlocks inventory and cash path after initial stock", () => {
		const visible = getVisibleBusinessModules({
			setup: baseState({
				hasWarehouse: true,
				hasCategory: true,
				hasProduct: true,
				hasInitialStock: true,
			}),
			hasEmployees: false,
		});
		expect(visible.inventory).toBe(true);
		expect(visible.sales).toBe(false);
	});

	it("unlocks sales when cash session is open", () => {
		const visible = getVisibleBusinessModules({
			setup: baseState({
				hasWarehouse: true,
				hasCategory: true,
				hasProduct: true,
				hasInitialStock: true,
				hasOpenCashSession: true,
				canAccessSales: true,
			}),
			hasEmployees: false,
		});
		expect(visible.sales).toBe(true);
		expect(visible.employees).toBe(true);
	});
});
