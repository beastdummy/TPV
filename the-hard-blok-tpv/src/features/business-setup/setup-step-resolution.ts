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
/**
 * Later setup flags are ignored until all prior steps are complete (recovers inconsistent DB state).
 */
export function normalizeSetupProgressFlags(
	flags: SetupProgressFlags,
): SetupProgressFlags {
	const normalized = { ...flags };
	let priorStepsComplete = true;

	for (const { flag } of SETUP_STEP_ORDER) {
		if (!priorStepsComplete) {
			normalized[flag] = false;
			continue;
		}
		if (!normalized[flag]) {
			priorStepsComplete = false;
		}
	}

	if (!isSetupReadyForCompletion(normalized)) {
		normalized.setupCompleted = false;
	}

	return normalized;
}

export function resolveSetupCurrentStep(flags: SetupProgressFlags): SetupStep {
	const progress = normalizeSetupProgressFlags(flags);

	if (progress.setupCompleted && isSetupReadyForCompletion(progress)) {
		return "complete";
	}

	for (const { flag, step } of SETUP_STEP_ORDER) {
		if (!progress[flag]) {
			return step;
		}
	}

	if (isSetupReadyForCompletion(progress)) {
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
	const progress = normalizeSetupProgressFlags(flags);
	const completed: SetupStep[] = [];

	for (const { flag, step } of SETUP_STEP_ORDER) {
		if (!progress[flag]) {
			break;
		}
		completed.push(step);
	}

	if (progress.setupCompleted && isSetupReadyForCompletion(progress)) {
		completed.push("complete");
	}

	return completed;
}

export function toBusinessSetupState(
	flags: SetupProgressFlags,
): BusinessSetupState {
	const progress = normalizeSetupProgressFlags(flags);
	const currentStep = resolveSetupCurrentStep(flags);

	return {
		businessDetailsConfirmed: progress.businessDetailsConfirmed,
		hasWarehouse: progress.hasWarehouse,
		hasCategory: progress.hasCategory,
		hasProduct: progress.hasProduct,
		hasInitialStock: progress.hasInitialStock,
		inventoryReviewed: progress.inventoryReviewed,
		cashConfigured: progress.cashConfigured,
		staffStepHandled: progress.staffStepHandled,
		hasCashSession: progress.hasOpenCashSession,
		hasOpenCashSession: progress.hasOpenCashSession,
		canAccessSales: canEnterSalesAfterSetup(progress),
		setupCompleted: progress.setupCompleted,
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
