import type { SetupStep } from "./types";
import { SETUP_STEPS } from "./types";

/** Pasos navegables en el asistente (sin `complete`). */
export const SETUP_NAV_STEPS = SETUP_STEPS.filter(
	(step) => step !== "complete",
) as Exclude<SetupStep, "complete">[];

export type SetupWizardSnapshot = {
	businessDetailsConfirmed: boolean;
	hasWarehouse: boolean;
	hasCategory: boolean;
	hasProduct: boolean;
	hasInitialStock: boolean;
	inventoryReviewed: boolean;
	cashConfigured: boolean;
	staffStepHandled: boolean;
	hasOpenCashSession: boolean;
};

export function getPreviousSetupStep(step: SetupStep): SetupStep | null {
	const index = SETUP_NAV_STEPS.indexOf(
		step as (typeof SETUP_NAV_STEPS)[number],
	);
	if (index <= 0) {
		return null;
	}
	return SETUP_NAV_STEPS[index - 1] ?? null;
}

export function getNextSetupStep(step: SetupStep): SetupStep | null {
	const index = SETUP_NAV_STEPS.indexOf(
		step as (typeof SETUP_NAV_STEPS)[number],
	);
	if (index < 0 || index >= SETUP_NAV_STEPS.length - 1) {
		return null;
	}
	return SETUP_NAV_STEPS[index + 1] ?? null;
}

export function canContinueFromSetupStep(
	step: SetupStep,
	snapshot: SetupWizardSnapshot,
): boolean {
	switch (step) {
		case "confirm_business":
			return snapshot.businessDetailsConfirmed;
		case "warehouse":
			return snapshot.hasWarehouse;
		case "category":
			return snapshot.hasCategory;
		case "product":
			return snapshot.hasProduct;
		case "initial_stock":
			return snapshot.hasInitialStock;
		case "review_inventory":
			return snapshot.inventoryReviewed;
		case "configure_cash":
			return snapshot.cashConfigured;
		case "staff":
			return true;
		case "open_cash":
			return snapshot.hasOpenCashSession;
		case "complete":
			return true;
		default:
			return false;
	}
}

export function getSetupContinueBlockedMessage(
	step: SetupStep,
	snapshot: SetupWizardSnapshot,
): string | null {
	if (canContinueFromSetupStep(step, snapshot)) {
		return null;
	}

	switch (step) {
		case "confirm_business":
			return "Confirma los datos del negocio para continuar.";
		case "warehouse":
			return "Crea al menos un almacén principal para continuar.";
		case "category":
			return "Crea al menos una familia o categoría para continuar.";
		case "product":
			return "Crea al menos un producto para continuar.";
		case "initial_stock":
			return "Registra al menos una compra o entrada inicial con stock.";
		case "review_inventory":
			return "Confirma la revisión del inventario para continuar.";
		case "configure_cash":
			return "Configura el fondo de caja para continuar.";
		case "open_cash":
			return "Abre la sesión de caja para continuar.";
		default:
			return "Completa este paso antes de continuar.";
	}
}

export function snapshotFromSetupState(setup: {
	businessDetailsConfirmed: boolean;
	hasWarehouse: boolean;
	hasCategory: boolean;
	hasProduct: boolean;
	hasInitialStock: boolean;
	inventoryReviewed: boolean;
	cashConfigured: boolean;
	staffStepHandled: boolean;
	hasOpenCashSession: boolean;
}): SetupWizardSnapshot {
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
	};
}
