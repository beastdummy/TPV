import {
	countActiveCategories,
	countActiveProducts,
	countActiveWarehouses,
	getBusinessSetupCompletedAt,
	hasInitialStockRecorded,
	hasOpenCashSessionForBusiness,
	isBusinessDetailsConfirmed,
	isCashConfiguredForBusiness,
	isInventoryReviewedForBusiness,
	isStaffStepHandledForBusiness,
} from "./setup-queries.server";
import {
	buildSetupCompletedSteps,
	canEnterSalesAfterSetup,
	isSetupReadyForCompletion,
	normalizeSetupProgressFlags,
	resolveSetupCurrentStep,
} from "./setup-step-resolution";
import type { BusinessSetupState, SetupStep } from "./types";
import { SETUP_STEPS } from "./types";

export {
	resolveSetupCurrentStep,
	buildSetupCompletedSteps,
	isSetupReadyForCompletion,
};

export async function getBusinessSetupState(
	businessId: string,
): Promise<BusinessSetupState> {
	const [
		businessDetailsConfirmed,
		warehouseCount,
		categoryCount,
		productCount,
		hasInitialStock,
		inventoryReviewed,
		cashConfigured,
		staffStepHandled,
		hasOpenCash,
		setupCompletedAt,
	] = await Promise.all([
		isBusinessDetailsConfirmed(businessId),
		countActiveWarehouses(),
		countActiveCategories(),
		countActiveProducts(),
		hasInitialStockRecorded(),
		isInventoryReviewedForBusiness(businessId),
		isCashConfiguredForBusiness(businessId),
		isStaffStepHandledForBusiness(businessId),
		hasOpenCashSessionForBusiness(businessId),
		getBusinessSetupCompletedAt(businessId),
	]);

	const hasWarehouse = warehouseCount > 0;
	const hasCategory = categoryCount > 0;
	const hasProduct = productCount > 0;
	const hasOpenCashSession = hasOpenCash;
	const setupCompleted = Boolean(setupCompletedAt);

	const flags = {
		businessDetailsConfirmed,
		hasWarehouse,
		hasCategory,
		hasProduct,
		hasInitialStock,
		inventoryReviewed,
		cashConfigured,
		staffStepHandled,
		hasOpenCashSession,
		setupCompleted,
	};

	const progress = normalizeSetupProgressFlags(flags);

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
		currentStep: resolveSetupCurrentStep(flags),
		completedSteps: buildSetupCompletedSteps(flags),
	};
}

export function requireSetupStep(
	state: BusinessSetupState,
	required: SetupStep,
): void {
	if (state.setupCompleted) {
		return;
	}

	const requiredIndex = SETUP_STEPS.indexOf(required);
	const currentIndex = SETUP_STEPS.indexOf(state.currentStep);

	if (currentIndex < requiredIndex) {
		throw new Error(`SETUP_STEP_REQUIRED:${required}`);
	}
}
