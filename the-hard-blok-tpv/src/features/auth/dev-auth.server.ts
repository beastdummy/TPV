import { APIError } from "better-auth/api";
import { getAuth } from "../../lib/auth.server";
import { db } from "../../lib/db.server";
import { ensureDefaultBusinessMembership } from "../tenancy/membership.server";
import { syncAppUserFromBetterAuthSession } from "./app-user.server";
import type { AuthUser } from "./types";

export const DEV_OWNER_EMAIL = "dev-owner@thehardblok.local";
export const DEV_OWNER_NAME = "Dev Owner";
export const DEV_OWNER_ROLE = "owner" as const;

/** Local-only credential; email/password auth is disabled in production. */
const DEV_OWNER_PASSWORD = "dev-owner-local-only";

export function isDevAuthEnabled(): boolean {
	return process.env.NODE_ENV !== "production";
}

export function assertDevAuthEnabled(): void {
	if (!isDevAuthEnabled()) {
		throw new Error("DEV_AUTH_DISABLED");
	}
}

function isUserAlreadyExistsError(error: unknown): boolean {
	return (
		error instanceof APIError &&
		error.body?.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
	);
}

export async function syncDevOwnerAppUser(params: {
	userId: string;
	email: string;
	name: string;
}): Promise<Pick<AuthUser, "id" | "email" | "name" | "role">> {
	const synced = await syncAppUserFromBetterAuthSession(params);

	await db.query(
		`
    UPDATE users
    SET role = $2, name = $3, updated_at = NOW()
    WHERE id = $1
    `,
		[synced.id, DEV_OWNER_ROLE, params.name],
	);

	await ensureDefaultBusinessMembership({
		userId: synced.id,
		role: DEV_OWNER_ROLE,
		isActive: true,
	});

	return {
		id: synced.id,
		email: synced.email,
		name: params.name,
		role: DEV_OWNER_ROLE,
	};
}

/**
 * Creates or signs in the dev owner via Better Auth email/password (dev only),
 * sets session cookies, and syncs the app user as owner with default tenancy.
 */
export async function signInDevOwner(): Promise<
	Pick<AuthUser, "id" | "email" | "name" | "role">
> {
	assertDevAuthEnabled();

	const { getRequestHeaders } = await import("@tanstack/react-start/server");
	const headers = getRequestHeaders();
	const auth = getAuth();

	const signUpBody = {
		email: DEV_OWNER_EMAIL,
		password: DEV_OWNER_PASSWORD,
		name: DEV_OWNER_NAME,
	};

	try {
		await auth.api.signUpEmail({
			body: signUpBody,
			headers,
		});
	} catch (error) {
		if (!isUserAlreadyExistsError(error)) {
			throw error;
		}
	}

	const signInResult = await auth.api.signInEmail({
		body: {
			email: DEV_OWNER_EMAIL,
			password: DEV_OWNER_PASSWORD,
		},
		headers,
	});

	if (!signInResult?.user?.id || !signInResult.user.email) {
		throw new Error("No se pudo crear la sesión de desarrollo.");
	}

	return await syncDevOwnerAppUser({
		userId: signInResult.user.id,
		email: signInResult.user.email,
		name: signInResult.user.name ?? DEV_OWNER_NAME,
	});
}
