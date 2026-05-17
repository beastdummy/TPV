export const BUSINESS_PERMISSION_ACTIONS = [
	"view",
	"create",
	"edit",
	"delete",
	"manage",
] as const;

export type BusinessPermissionAction =
	(typeof BUSINESS_PERMISSION_ACTIONS)[number];

export const BUSINESS_PERMISSION_MODULES = [
	"dashboard",
	"sales",
	"products",
	"categories",
	"inventory",
	"warehouses",
	"purchases",
	"employees",
	"roles",
	"reports",
	"settings",
	"audit",
] as const;

export type BusinessPermissionModule =
	(typeof BUSINESS_PERMISSION_MODULES)[number];

export type BusinessPermissionKey =
	`${BusinessPermissionModule}.${BusinessPermissionAction}`;

export function buildPermissionKey(
	module: BusinessPermissionModule,
	action: BusinessPermissionAction,
): BusinessPermissionKey {
	return `${module}.${action}`;
}

export const ALL_BUSINESS_PERMISSION_KEYS = BUSINESS_PERMISSION_MODULES.flatMap(
	(module) =>
		BUSINESS_PERMISSION_ACTIONS.map((action) =>
			buildPermissionKey(module, action),
		),
);

export const PERMISSION_ACTION_LABELS: Record<
	BusinessPermissionAction,
	string
> = {
	view: "Ver",
	create: "Crear",
	edit: "Editar",
	delete: "Eliminar",
	manage: "Gestionar",
};

export const PERMISSION_MODULE_LABELS: Record<
	BusinessPermissionModule,
	string
> = {
	dashboard: "Dashboard",
	sales: "TPV / Ventas",
	products: "Productos",
	categories: "Categorías",
	inventory: "Inventario",
	warehouses: "Almacenes",
	purchases: "Compras",
	employees: "Empleados",
	roles: "Roles y permisos",
	reports: "Informes",
	settings: "Ajustes",
	audit: "Auditoría",
};

import { BUSINESS_OWNER_ROLE } from "../tenancy/business-roles.types";

export { BUSINESS_OWNER_ROLE };

export function isBusinessOwnerRole(role: string): boolean {
	return role === BUSINESS_OWNER_ROLE;
}
