import type { BusinessSetupState, SetupStep } from "./types";

export type SetupProgressFlags = {
	businessDetailsConfirmed: boolean;
	hasWarehouse: boolean;
	hasCategory: boolean;
	hasProduct: boolean;
	hasInitialStock: boolean;
	inventoryReviewed: boolean;
	cashConfigured: boolean;
	staffStepHandled: boolean;
	hasOpenCashSession: boolean;
	setupCompleted: boolean;
};

export function resolveSetupCurrentStep(flags: SetupProgressFlags): SetupStep {
	if (flags.setupCompleted) {
		return "complete";
	}
	if (!flags.businessDetailsConfirmed) {
		return "confirm_business";
	}
	if (!flags.hasWarehouse) {
		return "warehouse";
	}
	if (!flags.hasCategory) {
		return "category";
	}
	if (!flags.hasProduct) {
		return "product";
	}
	if (!flags.hasInitialStock) {
		return "initial_stock";
	}
	if (!flags.inventoryReviewed) {
		return "review_inventory";
	}
	if (!flags.cashConfigured) {
		return "configure_cash";
	}
	if (!flags.staffStepHandled) {
		return "staff";
	}
	if (!flags.hasOpenCashSession) {
		return "open_cash";
	}
	return "complete";
}

export function buildSetupCompletedSteps(
	flags: SetupProgressFlags,
): SetupStep[] {
	const completed: SetupStep[] = [];

	if (flags.businessDetailsConfirmed) {
		completed.push("confirm_business");
	}
	if (flags.hasWarehouse) {
		completed.push("warehouse");
	}
	if (flags.hasCategory) {
		completed.push("category");
	}
	if (flags.hasProduct) {
		completed.push("product");
	}
	if (flags.hasInitialStock) {
		completed.push("initial_stock");
	}
	if (flags.inventoryReviewed) {
		completed.push("review_inventory");
	}
	if (flags.cashConfigured) {
		completed.push("configure_cash");
	}
	if (flags.staffStepHandled) {
		completed.push("staff");
	}
	if (flags.hasOpenCashSession) {
		completed.push("open_cash");
	}
	if (flags.setupCompleted) {
		completed.push("complete");
	}

	return completed;
}

export function isSetupReadyForCompletion(flags: SetupProgressFlags): boolean {
	return (
		flags.businessDetailsConfirmed &&
		flags.hasWarehouse &&
		flags.hasCategory &&
		flags.hasProduct &&
		flags.hasInitialStock &&
		flags.inventoryReviewed &&
		flags.cashConfigured &&
		flags.staffStepHandled &&
		flags.hasOpenCashSession
	);
}

export function toBusinessSetupState(
	flags: SetupProgressFlags,
): BusinessSetupState {
	return {
		businessDetailsConfirmed: flags.businessDetailsConfirmed,
		hasWarehouse: flags.hasWarehouse,
		hasCategory: flags.hasCategory,
		hasProduct: flags.hasProduct,
		hasInitialStock: flags.hasInitialStock,
		inventoryReviewed: flags.inventoryReviewed,
		cashConfigured: flags.cashConfigured,
		staffStepHandled: flags.staffStepHandled,
		hasCashSession: flags.hasOpenCashSession,
		hasOpenCashSession: flags.hasOpenCashSession,
		canAccessSales: flags.hasOpenCashSession,
		setupCompleted: flags.setupCompleted,
		currentStep: resolveSetupCurrentStep(flags),
		completedSteps: buildSetupCompletedSteps(flags),
	};
}
