import type { AdminNavLinkKey } from "../business-staff/admin-nav.server";
import type { BusinessSetupState } from "./types";

export type VisibleModulesInput = {
	setup: BusinessSetupState;
	hasEmployees: boolean;
};

/**
 * Módulos visibles según progreso real del negocio (independiente de permisos).
 * El owner sigue teniendo permisos totales, pero la UI oculta módulos no preparados.
 */
export function getVisibleBusinessModules(
	input: VisibleModulesInput,
): Record<AdminNavLinkKey, boolean> {
	const { setup, hasEmployees } = input;
	const operational = setup.setupCompleted || setup.hasOpenCashSession;

	return {
		dashboard: true,
		audit: true,
		warehouses: true,
		categories: setup.hasWarehouse,
		products: setup.hasCategory,
		purchases: setup.hasProduct && setup.hasWarehouse,
		inventory: setup.hasInitialStock,
		sales: setup.hasOpenCashSession,
		employees: operational,
		roles: hasEmployees || operational,
		settings: true,
	};
}

export function mergeNavVisibility(
	permissionVisible: Record<AdminNavLinkKey, boolean>,
	setupVisible: Record<AdminNavLinkKey, boolean>,
): Record<AdminNavLinkKey, boolean> {
	const keys = Object.keys(permissionVisible) as AdminNavLinkKey[];
	return Object.fromEntries(
		keys.map((key) => [key, permissionVisible[key] && setupVisible[key]]),
	) as Record<AdminNavLinkKey, boolean>;
}
