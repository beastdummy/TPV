import { describe, expect, it } from "vitest";

import {
	resolveSetupCurrentStep,
	toBusinessSetupState,
} from "./setup-step-resolution";
import {
	clampActiveSetupStep,
	getSafeSetupState,
	isSetupOperationallyReady,
} from "./setup-wizard-state";

const readyFlags = {
	businessDetailsConfirmed: true,
	hasWarehouse: true,
	hasCategory: true,
	hasProduct: true,
	hasInitialStock: true,
	inventoryReviewed: true,
	cashConfigured: true,
	staffStepHandled: true,
	hasOpenCashSession: true,
	setupCompleted: false,
};

describe("setup wizard state", () => {
	it("getSafeSetupState never leaves currentStep undefined", () => {
		const safe = getSafeSetupState(undefined);
		expect(safe.currentStep).toBe("confirm_business");
		expect(safe.completedSteps).toEqual([]);
	});

	it("does not resolve complete when inventory was not reviewed", () => {
		expect(
			resolveSetupCurrentStep({
				...readyFlags,
				inventoryReviewed: false,
				hasOpenCashSession: true,
			}),
		).toBe("review_inventory");
	});

	it("clamps active complete to required step when setup is incomplete", () => {
		const setup = toBusinessSetupState({
			...readyFlags,
			inventoryReviewed: false,
			hasOpenCashSession: true,
		});

		expect(clampActiveSetupStep("complete", setup.currentStep, setup)).toBe(
			"review_inventory",
		);
	});

	it("allows complete view only when operationally ready", () => {
		const setup = toBusinessSetupState(readyFlags);
		expect(isSetupOperationallyReady(setup)).toBe(true);
		expect(setup.currentStep).toBe("complete");
	});
});
