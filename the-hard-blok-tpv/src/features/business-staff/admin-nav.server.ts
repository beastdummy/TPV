import { getCurrentTenantContext } from "../auth/tenant-guards.server";
import { countActiveEmployeesForBusiness } from "../business-setup/setup-queries.server";
import { getBusinessSetupState } from "../business-setup/setup-state.server";
import {
	getVisibleBusinessModules,
	mergeNavVisibility,
} from "../business-setup/visible-modules";
import { hasBusinessPermission } from "./business-permissions.server";
import { isBusinessOwnerRole } from "./permissions";

export type AdminNavLinkKey =
	| "dashboard"
	| "sales"
	| "products"
	| "categories"
	| "inventory"
	| "warehouses"
	| "purchases"
	| "employees"
	| "roles"
	| "audit"
	| "settings";

export type AdminNavContext = {
	role: string;
	isOwner: boolean;
	visible: Record<AdminNavLinkKey, boolean>;
};

const NAV_PERMISSIONS: Record<AdminNavLinkKey, string> = {
	dashboard: "dashboard.view",
	sales: "sales.view",
	products: "products.view",
	categories: "categories.view",
	inventory: "inventory.view",
	warehouses: "warehouses.view",
	purchases: "purchases.view",
	employees: "employees.view",
	roles: "roles.view",
	audit: "audit.view",
	settings: "settings.view",
};

const ALL_VISIBLE: Record<AdminNavLinkKey, boolean> = {
	dashboard: true,
	sales: true,
	products: true,
	categories: true,
	inventory: true,
	warehouses: true,
	purchases: true,
	employees: true,
	roles: true,
	audit: true,
	settings: true,
};

const ALL_HIDDEN: Record<AdminNavLinkKey, boolean> = {
	dashboard: false,
	sales: false,
	products: false,
	categories: false,
	inventory: false,
	warehouses: false,
	purchases: false,
	employees: false,
	roles: false,
	audit: false,
	settings: false,
};

export async function getAdminNavContext(): Promise<AdminNavContext> {
	const ctx = await getCurrentTenantContext();

	if (!ctx?.business) {
		return {
			role: ctx?.role ?? "cashier",
			isOwner: false,
			visible: ALL_HIDDEN,
		};
	}

	const businessId = ctx.business.businessId;
	const [setup, employeeCount] = await Promise.all([
		getBusinessSetupState(businessId),
		countActiveEmployeesForBusiness(businessId),
	]);

	const setupVisible = getVisibleBusinessModules({
		setup,
		hasEmployees: employeeCount > 0,
	});

	if (isBusinessOwnerRole(ctx.role)) {
		return {
			role: ctx.role,
			isOwner: true,
			visible: mergeNavVisibility(ALL_VISIBLE, setupVisible),
		};
	}

	const entries = await Promise.all(
		(Object.entries(NAV_PERMISSIONS) as Array<[AdminNavLinkKey, string]>).map(
			async ([key, permission]) => {
				const allowed = await hasBusinessPermission(permission);
				return [key, allowed] as const;
			},
		),
	);

	const permissionVisible = Object.fromEntries(entries) as Record<
		AdminNavLinkKey,
		boolean
	>;

	return {
		role: ctx.role,
		isOwner: false,
		visible: mergeNavVisibility(permissionVisible, setupVisible),
	};
}
