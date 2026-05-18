import { describe, expect, it } from "vitest";

import {
	buildSetupCompletedSteps,
	isSetupReadyForCompletion,
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
