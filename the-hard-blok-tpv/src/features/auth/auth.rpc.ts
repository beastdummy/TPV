import { createServerFn } from "@tanstack/react-start";

import {
	CATALOG_MANAGEMENT_ROLES,
	POS_OPERATION_ROLES,
	type Role,
} from "./types";

export const getAppUserFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const { getRequestHeaders } = await import("@tanstack/react-start/server");
		const { getAuth } = await import("../../lib/auth.server");
		const { syncAppUserFromBetterAuthSession } = await import(
			"./app-user.server"
		);

		const headers = getRequestHeaders();
		const session = await getAuth().api.getSession({ headers });

		if (!session) {
			return null;
		}

		return await syncAppUserFromBetterAuthSession({
			userId: session.user.id,
			email: session.user.email,
			name: session.user.name,
		});
	},
);

/** Whether OAuth providers are configured (no secrets exposed to the client). */
export const getOAuthSetupFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
		const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

		return {
			google: Boolean(googleClientId && googleClientSecret),
		};
	},
);

async function ensureRoleIn(allowedRoles: Role[]) {
	const user = await getAppUserFn();

	if (!user) {
		throw new Error("UNAUTHORIZED");
	}

	if (!allowedRoles.includes(user.role)) {
		throw new Error("FORBIDDEN");
	}

	return user;
}

export async function ensureCatalogManagementRole() {
	return await ensureRoleIn(CATALOG_MANAGEMENT_ROLES);
}

export async function ensurePosOperationRole() {
	return await ensureRoleIn(POS_OPERATION_ROLES);
}
