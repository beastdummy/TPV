import type { BusinessRoleRow } from "./types";

export type RolesPageOwnerInfo = {
	slug: string;
	name: string;
	description: string;
	member_count: number;
	is_system: true;
};

export type RolesPageLoaderData = {
	roles: BusinessRoleRow[];
	owner: RolesPageOwnerInfo;
};

const DEFAULT_OWNER: RolesPageOwnerInfo = {
	slug: "owner",
	name: "Propietario",
	description: "Acceso total automático a todos los módulos.",
	member_count: 0,
	is_system: true,
};

function isBusinessRoleRow(value: unknown): value is BusinessRoleRow {
	if (!value || typeof value !== "object") {
		return false;
	}

	const row = value as BusinessRoleRow;
	return (
		typeof row.id === "string" &&
		typeof row.slug === "string" &&
		typeof row.name === "string"
	);
}

/**
 * Normaliza la respuesta del loader/RPC de roles (evita roles.filter sobre objeto).
 */
export function normalizeRolesPageData(payload: unknown): RolesPageLoaderData {
	if (Array.isArray(payload)) {
		return {
			roles: payload.filter(isBusinessRoleRow),
			owner: DEFAULT_OWNER,
		};
	}

	if (!payload || typeof payload !== "object") {
		return { roles: [], owner: DEFAULT_OWNER };
	}

	const record = payload as Record<string, unknown>;
	const nestedRoles = record.roles;

	if (Array.isArray(nestedRoles)) {
		const owner =
			record.owner && typeof record.owner === "object"
				? ({
						...DEFAULT_OWNER,
						...(record.owner as object),
					} as RolesPageOwnerInfo)
				: DEFAULT_OWNER;

		return {
			roles: nestedRoles.filter(isBusinessRoleRow),
			owner,
		};
	}

	if (
		nestedRoles &&
		typeof nestedRoles === "object" &&
		Array.isArray((nestedRoles as { roles?: unknown }).roles)
	) {
		return normalizeRolesPageData(nestedRoles);
	}

	return { roles: [], owner: DEFAULT_OWNER };
}
