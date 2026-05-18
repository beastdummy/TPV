import { describe, expect, it } from "vitest";

import {
	buildSetupCompletedSteps,
	isSetupReadyForCompletion,
	normalizeSetupProgressFlags,
	resolveSetupCurrentStep,
} from "./setup-step-resolution";

const baseFlags = {
	businessDetailsConfirmed: false,
	hasWarehouse: false,
	hasCategory: false,
	hasProduct: false,
	hasInitialStock: false,
	inventoryReviewed: false,
	cashConfigured: false,
	staffStepHandled: false,
	hasOpenCashSession: false,
	setupCompleted: false,
};

describe("resolveSetupCurrentStep", () => {
	it("returns initial_stock when product exists but stock does not", () => {
		expect(
			resolveSetupCurrentStep({
				...baseFlags,
				businessDetailsConfirmed: true,
				hasWarehouse: true,
				hasCategory: true,
				hasProduct: true,
				hasInitialStock: false,
			}),
		).toBe("initial_stock");
	});

	it("follows strict order without skipping configure_cash or open_cash", () => {
		expect(resolveSetupCurrentStep(baseFlags)).toBe("confirm_business");

		expect(
			resolveSetupCurrentStep({
				...baseFlags,
				businessDetailsConfirmed: true,
				hasWarehouse: true,
				hasCategory: true,
				hasProduct: true,
				hasInitialStock: true,
			}),
		).toBe("review_inventory");

		expect(
			resolveSetupCurrentStep({
				...baseFlags,
				businessDetailsConfirmed: true,
				hasWarehouse: true,
				hasCategory: true,
				hasProduct: true,
				hasInitialStock: true,
				inventoryReviewed: true,
			}),
		).toBe("configure_cash");

		expect(
			resolveSetupCurrentStep({
				...baseFlags,
				businessDetailsConfirmed: true,
				hasWarehouse: true,
				hasCategory: true,
				hasProduct: true,
				hasInitialStock: true,
				inventoryReviewed: true,
				cashConfigured: true,
				staffStepHandled: false,
			}),
		).toBe("staff");

		expect(
			resolveSetupCurrentStep({
				...baseFlags,
				businessDetailsConfirmed: true,
				hasWarehouse: true,
				hasCategory: true,
				hasProduct: true,
				hasInitialStock: true,
				inventoryReviewed: true,
				cashConfigured: true,
				staffStepHandled: true,
			}),
		).toBe("open_cash");

		expect(
			resolveSetupCurrentStep({
				...baseFlags,
				businessDetailsConfirmed: true,
				hasWarehouse: true,
				hasCategory: true,
				hasProduct: true,
				hasInitialStock: true,
				inventoryReviewed: true,
				cashConfigured: true,
				staffStepHandled: true,
				hasOpenCashSession: true,
			}),
		).toBe("complete");
	});

	it("does not mark setup complete before open cash", () => {
		expect(
			isSetupReadyForCompletion({
				...baseFlags,
				businessDetailsConfirmed: true,
				hasWarehouse: true,
				hasCategory: true,
				hasProduct: true,
				hasInitialStock: true,
				inventoryReviewed: true,
				cashConfigured: true,
				staffStepHandled: true,
				hasOpenCashSession: false,
			}),
		).toBe(false);
	});

	it("lists completed steps in order", () => {
		const steps = buildSetupCompletedSteps({
			...baseFlags,
			businessDetailsConfirmed: true,
			hasWarehouse: true,
			hasCategory: true,
			hasProduct: true,
			hasInitialStock: true,
			inventoryReviewed: true,
			cashConfigured: true,
			staffStepHandled: true,
			hasOpenCashSession: true,
		});

		expect(steps).toEqual([
			"confirm_business",
			"warehouse",
			"category",
			"product",
			"initial_stock",
			"review_inventory",
			"configure_cash",
			"staff",
			"open_cash",
		]);
	});

	it("never returns complete with inconsistent flags even if cash is open", () => {
		expect(
			resolveSetupCurrentStep({
				...baseFlags,
				businessDetailsConfirmed: true,
				hasWarehouse: true,
				hasCategory: true,
				hasProduct: true,
				hasInitialStock: true,
				inventoryReviewed: false,
				cashConfigured: true,
				staffStepHandled: true,
				hasOpenCashSession: true,
			}),
		).toBe("review_inventory");
	});

	it("does not mark open_cash completed when inventory is not reviewed", () => {
		const steps = buildSetupCompletedSteps({
			...baseFlags,
			businessDetailsConfirmed: true,
			hasWarehouse: true,
			hasCategory: true,
			hasProduct: true,
			hasInitialStock: true,
			inventoryReviewed: false,
			cashConfigured: true,
			staffStepHandled: true,
			hasOpenCashSession: true,
		});

		expect(steps).toEqual([
			"confirm_business",
			"warehouse",
			"category",
			"product",
			"initial_stock",
		]);
		expect(steps).not.toContain("open_cash");
	});

	it("normalizeSetupProgressFlags clears later flags until inventory is reviewed", () => {
		const normalized = normalizeSetupProgressFlags({
			...baseFlags,
			businessDetailsConfirmed: true,
			hasWarehouse: true,
			hasCategory: true,
			hasProduct: true,
			hasInitialStock: true,
			inventoryReviewed: false,
			cashConfigured: true,
			staffStepHandled: true,
			hasOpenCashSession: true,
			setupCompleted: true,
		});

		expect(normalized.inventoryReviewed).toBe(false);
		expect(normalized.cashConfigured).toBe(false);
		expect(normalized.hasOpenCashSession).toBe(false);
		expect(normalized.setupCompleted).toBe(false);
	});

	it("review_inventory to configure_cash flow keeps step 6 completed after refresh", () => {
		const afterReview = {
			...baseFlags,
			businessDetailsConfirmed: true,
			hasWarehouse: true,
			hasCategory: true,
			hasProduct: true,
			hasInitialStock: true,
			inventoryReviewed: true,
			cashConfigured: false,
			staffStepHandled: false,
			hasOpenCashSession: false,
		};

		expect(resolveSetupCurrentStep(afterReview)).toBe("configure_cash");
		expect(buildSetupCompletedSteps(afterReview)).toContain("review_inventory");
		expect(buildSetupCompletedSteps(afterReview)).not.toContain("open_cash");
	});

	it("after inventory reviewed, required step is configure_cash when cash is not configured", () => {
		expect(
			resolveSetupCurrentStep({
				...baseFlags,
				businessDetailsConfirmed: true,
				hasWarehouse: true,
				hasCategory: true,
				hasProduct: true,
				hasInitialStock: true,
				inventoryReviewed: true,
				cashConfigured: false,
			}),
		).toBe("configure_cash");
	});

	it("resolveSetupCurrentStep always returns a valid step id", () => {
		const step = resolveSetupCurrentStep(baseFlags);
		expect(step).toBeTruthy();
		expect(typeof step).toBe("string");
	});

	it("setup can complete with only owner when staff step was skipped", () => {
		expect(
			isSetupReadyForCompletion({
				...baseFlags,
				businessDetailsConfirmed: true,
				hasWarehouse: true,
				hasCategory: true,
				hasProduct: true,
				hasInitialStock: true,
				inventoryReviewed: true,
				cashConfigured: true,
				staffStepHandled: true,
				hasOpenCashSession: true,
			}),
		).toBe(true);
	});
});
