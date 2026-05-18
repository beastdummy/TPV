import type { BusinessSetupState, SetupStep } from "./types";
import { SETUP_STEPS } from "./types";

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

const SETUP_STEP_ORDER: Array<{
	flag: keyof SetupProgressFlags;
	step: SetupStep;
}> = [
	{ flag: "businessDetailsConfirmed", step: "confirm_business" },
	{ flag: "hasWarehouse", step: "warehouse" },
	{ flag: "hasCategory", step: "category" },
	{ flag: "hasProduct", step: "product" },
	{ flag: "hasInitialStock", step: "initial_stock" },
	{ flag: "inventoryReviewed", step: "review_inventory" },
	{ flag: "cashConfigured", step: "configure_cash" },
	{ flag: "staffStepHandled", step: "staff" },
	{ flag: "hasOpenCashSession", step: "open_cash" },
];

export const DEFAULT_SETUP_STEP: SetupStep = "confirm_business";

export function normalizeSetupStep(
	step: SetupStep | null | undefined,
): SetupStep {
	if (step && SETUP_STEPS.includes(step)) {
		return step;
	}
	return DEFAULT_SETUP_STEP;
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

/**
 * Primer paso obligatorio pendiente según flags reales (nunca asume complete por datos inconsistentes).
 */
export function resolveSetupCurrentStep(flags: SetupProgressFlags): SetupStep {
	if (flags.setupCompleted && isSetupReadyForCompletion(flags)) {
		return "complete";
	}

	for (const { flag, step } of SETUP_STEP_ORDER) {
		if (!flags[flag]) {
			return step;
		}
	}

	if (isSetupReadyForCompletion(flags)) {
		return "complete";
	}

	return "open_cash";
}

export function canShowSetupCompleteStep(flags: SetupProgressFlags): boolean {
	return isSetupReadyForCompletion(flags) && flags.hasOpenCashSession;
}

export function canEnterSalesAfterSetup(flags: SetupProgressFlags): boolean {
	return flags.setupCompleted && canShowSetupCompleteStep(flags);
}

export function buildSetupCompletedSteps(
	flags: SetupProgressFlags,
): SetupStep[] {
	const completed: SetupStep[] = [];

	for (const { flag, step } of SETUP_STEP_ORDER) {
		if (flags[flag]) {
			completed.push(step);
		}
	}

	if (flags.setupCompleted && isSetupReadyForCompletion(flags)) {
		completed.push("complete");
	}

	return completed;
}

export function toBusinessSetupState(
	flags: SetupProgressFlags,
): BusinessSetupState {
	const currentStep = resolveSetupCurrentStep(flags);

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
		canAccessSales: canEnterSalesAfterSetup(flags),
		setupCompleted: flags.setupCompleted,
		currentStep,
		completedSteps: buildSetupCompletedSteps(flags),
	};
}

export function createDefaultSetupProgressFlags(): SetupProgressFlags {
	return {
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
}

export function createDefaultBusinessSetupState(): BusinessSetupState {
	return toBusinessSetupState(createDefaultSetupProgressFlags());
}
