import { getNextSetupStep } from "./setup-navigation";
import {
	canEnterSalesAfterSetup,
	canShowSetupCompleteStep,
	createDefaultBusinessSetupState,
	isSetupReadyForCompletion,
	normalizeSetupStep,
	type SetupProgressFlags,
} from "./setup-step-resolution";
import type { BusinessSetupState, SetupStep } from "./types";
import { SETUP_STEPS } from "./types";

export function getSafeSetupState(
	setup: BusinessSetupState | null | undefined,
): BusinessSetupState {
	if (!setup?.currentStep) {
		return createDefaultBusinessSetupState();
	}

	return {
		...setup,
		currentStep: normalizeSetupStep(setup.currentStep),
		completedSteps: Array.isArray(setup.completedSteps)
			? setup.completedSteps
			: [],
	};
}

export function flagsFromSetupState(
	setup: BusinessSetupState,
): SetupProgressFlags {
	return {
		businessDetailsConfirmed: setup.businessDetailsConfirmed,
		hasWarehouse: setup.hasWarehouse,
		hasCategory: setup.hasCategory,
		hasProduct: setup.hasProduct,
		hasInitialStock: setup.hasInitialStock,
		inventoryReviewed: setup.inventoryReviewed,
		cashConfigured: setup.cashConfigured,
		staffStepHandled: setup.staffStepHandled,
		hasOpenCashSession: setup.hasOpenCashSession,
		setupCompleted: setup.setupCompleted,
	};
}

export function canEnterSalesFromSetup(
	setup: BusinessSetupState | null | undefined,
): boolean {
	const safe = getSafeSetupState(setup);
	return canEnterSalesAfterSetup(flagsFromSetupState(safe));
}

export function isSetupOperationallyReady(
	setup: BusinessSetupState | null | undefined,
): boolean {
	const safe = getSafeSetupState(setup);
	return isSetupReadyForCompletion(flagsFromSetupState(safe));
}

export function clampActiveSetupStep(
	activeStep: SetupStep,
	requiredStep: SetupStep,
	setup: BusinessSetupState | null | undefined,
): SetupStep {
	const safeActive = normalizeSetupStep(activeStep);
	const safeRequired = normalizeSetupStep(requiredStep);

	if (
		safeActive === "complete" &&
		!canShowSetupCompleteStep(flagsFromSetupState(getSafeSetupState(setup)))
	) {
		return safeRequired;
	}

	const activeIndex = SETUP_STEPS.indexOf(safeActive);
	const requiredIndex = SETUP_STEPS.indexOf(safeRequired);
	const nextRequired = getNextSetupStep(safeRequired);

	if (nextRequired && safeActive === nextRequired) {
		return safeActive;
	}

	if (activeIndex > requiredIndex && safeRequired !== "complete") {
		return safeRequired;
	}

	return safeActive;
}
