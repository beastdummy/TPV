import { APIError } from "better-auth/api";

import { getAuth } from "../../lib/auth.server";
import { db } from "../../lib/db.server";
import { upsertActivePlatformAdmin } from "../platform/platform-admin-queries.server";
import type { PlatformRole } from "../platform/types";
import { syncAppUserFromBetterAuthSession } from "./app-user.server";
import type { AuthUser, Role, SessionUser } from "./types";

export const DEV_PLATFORM_OWNER_EMAIL = "platform-owner@thehardblok.local";
export const DEV_PLATFORM_OWNER_NAME = "Platform Owner Dev";
export const DEV_PLATFORM_OWNER_ROLE = "owner" satisfies PlatformRole;

/** @deprecated Use DEV_PLATFORM_OWNER_EMAIL */
export const DEV_OWNER_EMAIL = DEV_PLATFORM_OWNER_EMAIL;
/** @deprecated Use DEV_PLATFORM_OWNER_NAME */
export const DEV_OWNER_NAME = DEV_PLATFORM_OWNER_NAME;

/** Legacy users.role for platform-only operators (sin business_members). */
export const DEV_PLATFORM_LEGACY_USER_ROLE = "cashier" as const satisfies Role;

/** Local-only credential for the synthetic platform dev Better Auth account. */
const DEV_PLATFORM_OWNER_PASSWORD = "dev-owner-local-only";

type AppUserRow = Pick<
	AuthUser,
	"id" | "email" | "name" | "role" | "is_active"
>;

export type DevLoginResult = SessionUser & {
	redirectTo: "/platform";
};

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

function isInvalidCredentialsError(error: unknown): boolean {
	return (
		error instanceof APIError &&
		(error.body?.code === "INVALID_EMAIL_OR_PASSWORD" || error.status === 401)
	);
}

export async function findAppUserByEmail(
	email: string,
): Promise<AppUserRow | null> {
	const normalized = email.trim().toLowerCase();
	const result = await db.query<AppUserRow>(
		`
    SELECT id, email, name, role, is_active
    FROM users
    WHERE email = $1
      AND is_active = TRUE
    LIMIT 1
    `,
		[normalized],
	);

	return result.rows[0] ?? null;
}

async function signInPlatformDevWithBetterAuth() {
	const { getRequestHeaders } = await import("@tanstack/react-start/server");
	const headers = getRequestHeaders();
	const auth = getAuth();
	const credentials = {
		email: DEV_PLATFORM_OWNER_EMAIL,
		password: DEV_PLATFORM_OWNER_PASSWORD,
		name: DEV_PLATFORM_OWNER_NAME,
	};

	try {
		const result = await auth.api.signInEmail({
			body: credentials,
			headers,
		});
		if (result?.user?.id && result.user.email) {
			return result;
		}
	} catch (error) {
		if (!isInvalidCredentialsError(error)) {
			throw error;
		}
	}

	try {
		await auth.api.signUpEmail({
			body: credentials,
			headers,
		});
	} catch (error) {
		if (!isUserAlreadyExistsError(error)) {
			throw error;
		}
	}

	const result = await auth.api.signInEmail({
		body: credentials,
		headers,
	});

	if (!result?.user?.id || !result.user.email) {
		throw new Error("No se pudo crear la sesión de desarrollo.");
	}

	return result;
}

/**
 * Platform operator sync: platform_admins only — no businesses nor business_members.
 */
export async function syncDevPlatformOwnerAppUser(params: {
	userId: string;
	email: string;
	name: string;
}): Promise<DevLoginResult> {
	const synced = await syncAppUserFromBetterAuthSession({
		userId: params.userId,
		email: params.email,
		name: params.name,
	});

	await db.query(
		`
    UPDATE users
    SET role = $2, name = $3, updated_at = NOW()
    WHERE id = $1
    `,
		[synced.id, DEV_PLATFORM_LEGACY_USER_ROLE, params.name],
	);

	await upsertActivePlatformAdmin({
		userId: synced.id,
		role: DEV_PLATFORM_OWNER_ROLE,
	});

	return {
		id: synced.id,
		email: synced.email,
		name: params.name,
		role: DEV_PLATFORM_LEGACY_USER_ROLE,
		redirectTo: "/platform",
	};
}

/**
 * Signs in via Better Auth (dev only) as platform-owner@thehardblok.local
 * with platform role owner. Does not create tenant businesses or memberships.
 */
export async function signInDevOwner(): Promise<DevLoginResult> {
	assertDevAuthEnabled();

	const signInResult = await signInPlatformDevWithBetterAuth();

	return await syncDevPlatformOwnerAppUser({
		userId: signInResult.user.id,
		email: signInResult.user.email,
		name: signInResult.user.name ?? DEV_PLATFORM_OWNER_NAME,
	});
}
