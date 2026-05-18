import {
	type BusinessPermissionKey,
	buildPermissionKey,
} from "../business-staff/permissions";

export type SetupQuickRolePresetKey = "cajero" | "camarero" | "encargado";

export type SetupQuickRolePreset = {
	key: SetupQuickRolePresetKey;
	name: string;
	slug: string;
	description: string;
	permissions: BusinessPermissionKey[];
};

export const SETUP_QUICK_ROLE_PRESETS: SetupQuickRolePreset[] = [
	{
		key: "cajero",
		name: "Cajero",
		slug: "cajero",
		description: "TPV, cobro y consulta de carta.",
		permissions: [
			buildPermissionKey("dashboard", "view"),
			buildPermissionKey("sales", "view"),
			buildPermissionKey("sales", "create"),
			buildPermissionKey("products", "view"),
			buildPermissionKey("categories", "view"),
		],
	},
	{
		key: "camarero",
		name: "Camarero",
		slug: "camarero",
		description: "Toma pedidos y ventas en sala.",
		permissions: [
			buildPermissionKey("dashboard", "view"),
			buildPermissionKey("sales", "view"),
			buildPermissionKey("sales", "create"),
			buildPermissionKey("products", "view"),
			buildPermissionKey("categories", "view"),
		],
	},
	{
		key: "encargado",
		name: "Encargado",
		slug: "encargado",
		description: "Gestión operativa del local.",
		permissions: [
			buildPermissionKey("dashboard", "view"),
			buildPermissionKey("sales", "view"),
			buildPermissionKey("sales", "create"),
			buildPermissionKey("sales", "edit"),
			buildPermissionKey("products", "view"),
			buildPermissionKey("products", "edit"),
			buildPermissionKey("categories", "view"),
			buildPermissionKey("categories", "edit"),
			buildPermissionKey("inventory", "view"),
			buildPermissionKey("inventory", "edit"),
			buildPermissionKey("warehouses", "view"),
			buildPermissionKey("purchases", "view"),
			buildPermissionKey("purchases", "create"),
			buildPermissionKey("employees", "view"),
			buildPermissionKey("reports", "view"),
		],
	},
];

export function getSetupQuickRolePreset(key: SetupQuickRolePresetKey) {
	const preset = SETUP_QUICK_ROLE_PRESETS.find((item) => item.key === key);
	if (!preset) {
		throw new Error("Preset de rol no válido.");
	}
	return preset;
}
