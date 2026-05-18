import {
	countActiveCategories,
	countActiveProducts,
	countActiveWarehouses,
	countCashSessionsForBusiness,
	getBusinessSetupCompletedAt,
	hasInitialStockRecorded,
	hasOpenCashSessionForBusiness,
} from "./setup-queries.server";
import type { BusinessSetupState, SetupStep } from "./types";
import { SETUP_STEPS } from "./types";

function resolveCurrentStep(flags: {
	hasWarehouse: boolean;
	hasCategory: boolean;
	hasProduct: boolean;
	hasInitialStock: boolean;
	hasOpenCashSession: boolean;
	setupCompleted: boolean;
}): SetupStep {
	if (flags.setupCompleted) {
		return "complete";
	}
	if (!flags.hasWarehouse) {
		return "confirm_business";
	}
	if (!flags.hasCategory) {
		return "warehouse";
	}
	if (!flags.hasProduct) {
		return "category";
	}
	if (!flags.hasInitialStock) {
		return "product";
	}
	if (!flags.hasOpenCashSession) {
		return "open_cash";
	}
	return "complete";
}

function buildCompletedSteps(flags: {
	hasWarehouse: boolean;
	hasCategory: boolean;
	hasProduct: boolean;
	hasInitialStock: boolean;
	hasCashSession: boolean;
	hasOpenCashSession: boolean;
	setupCompleted: boolean;
}): SetupStep[] {
	const completed: SetupStep[] = [];

	if (flags.hasWarehouse) {
		completed.push("confirm_business", "warehouse");
	}
	if (flags.hasCategory) {
		completed.push("category");
	}
	if (flags.hasProduct) {
		completed.push("product");
	}
	if (flags.hasInitialStock) {
		completed.push("initial_stock", "review_inventory");
	}
	if (flags.hasCashSession) {
		completed.push("configure_cash");
	}
	if (flags.hasOpenCashSession) {
		completed.push("open_cash");
	}
	if (flags.setupCompleted) {
		completed.push("complete");
	}

	return completed;
}

export async function getBusinessSetupState(
	businessId: string,
): Promise<BusinessSetupState> {
	const [
		warehouseCount,
		categoryCount,
		productCount,
		hasInitialStock,
		cashSessionCount,
		hasOpenCash,
		setupCompletedAt,
	] = await Promise.all([
		countActiveWarehouses(),
		countActiveCategories(),
		countActiveProducts(),
		hasInitialStockRecorded(),
		countCashSessionsForBusiness(businessId),
		hasOpenCashSessionForBusiness(businessId),
		getBusinessSetupCompletedAt(businessId),
	]);

	const hasWarehouse = warehouseCount > 0;
	const hasCategory = categoryCount > 0;
	const hasProduct = productCount > 0;
	const hasCashSession = cashSessionCount > 0;
	const hasOpenCashSession = hasOpenCash;
	const setupCompleted = Boolean(setupCompletedAt);
	const canAccessSales = hasOpenCashSession;

	const flags = {
		hasWarehouse,
		hasCategory,
		hasProduct,
		hasInitialStock,
		hasCashSession,
		hasOpenCashSession,
		setupCompleted,
	};

	return {
		hasWarehouse,
		hasCategory,
		hasProduct,
		hasInitialStock,
		hasCashSession,
		hasOpenCashSession,
		canAccessSales,
		setupCompleted,
		currentStep: resolveCurrentStep(flags),
		completedSteps: buildCompletedSteps(flags),
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
