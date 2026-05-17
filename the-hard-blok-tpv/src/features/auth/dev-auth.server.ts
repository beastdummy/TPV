import { APIError } from "better-auth/api";

import { getAuth } from "../../lib/auth.server";
import { db } from "../../lib/db.server";
import { getDefaultBusinessConfig } from "../tenancy/config.server";
import { ensureDefaultBusinessMembership } from "../tenancy/membership.server";
import { syncAppUserFromBetterAuthSession } from "./app-user.server";
import type { AuthUser, Role } from "./types";

export const PREFERRED_DEV_OWNER_EMAIL = "admin@thehardblok.local";
export const DEV_OWNER_EMAIL = "dev-owner@thehardblok.local";
export const DEV_OWNER_NAME = "Dev Owner";
export const DEV_OWNER_ROLE = "owner" as const;

/** Matches db/seed_admin.sql default credentials. */
const SEED_ADMIN_PASSWORD = "Admin1234!";

/** Local-only credential for the synthetic dev-owner Better Auth account. */
const DEV_OWNER_PASSWORD = "dev-owner-local-only";

type AppUserRow = Pick<
	AuthUser,
	"id" | "email" | "name" | "role" | "is_active"
>;

type DevLoginTarget =
	| {
			mode: "existing_owner";
			email: string;
			name: string;
			password: string;
			appUserId: string;
			appRole: Role;
	  }
	| {
			mode: "create_dev_owner";
			email: string;
			name: string;
			password: string;
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

export async function defaultBusinessHasActiveOwner(): Promise<boolean> {
	const { slug } = getDefaultBusinessConfig();
	const result = await db.query<{ exists: number }>(
		`
    SELECT 1 AS exists
    FROM business_members bm
    INNER JOIN businesses b ON b.id = bm.business_id
    WHERE b.slug = $1
      AND bm.role = 'owner'
      AND bm.status = 'active'
    LIMIT 1
    `,
		[slug],
	);

	return Boolean(result.rows[0]);
}

async function findDefaultBusinessOwnerUser(): Promise<AppUserRow | null> {
	const { slug } = getDefaultBusinessConfig();
	const result = await db.query<AppUserRow>(
		`
    SELECT u.id, u.email, u.name, u.role, u.is_active
    FROM users u
    INNER JOIN business_members bm ON bm.user_id = u.id
    INNER JOIN businesses b ON b.id = bm.business_id
    WHERE b.slug = $1
      AND bm.role = 'owner'
      AND bm.status = 'active'
      AND u.is_active = TRUE
    ORDER BY u.email ASC
    LIMIT 1
    `,
		[slug],
	);

	return result.rows[0] ?? null;
}

export async function resolveDevLoginTarget(): Promise<DevLoginTarget> {
	const admin = await findAppUserByEmail(PREFERRED_DEV_OWNER_EMAIL);

	if (admin) {
		return {
			mode: "existing_owner",
			email: admin.email,
			name: admin.name,
			password: SEED_ADMIN_PASSWORD,
			appUserId: admin.id,
			appRole: admin.role,
		};
	}

	const owner = await findDefaultBusinessOwnerUser();

	if (owner) {
		return {
			mode: "existing_owner",
			email: owner.email,
			name: owner.name,
			password: DEV_OWNER_PASSWORD,
			appUserId: owner.id,
			appRole: owner.role,
		};
	}

	return {
		mode: "create_dev_owner",
		email: DEV_OWNER_EMAIL,
		name: DEV_OWNER_NAME,
		password: DEV_OWNER_PASSWORD,
	};
}

async function signInDevOwnerWithBetterAuth(target: DevLoginTarget) {
	const { getRequestHeaders } = await import("@tanstack/react-start/server");
	const headers = getRequestHeaders();
	const auth = getAuth();
	const credentials = {
		email: target.email,
		password: target.password,
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
			body: {
				...credentials,
				name: target.name,
			},
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

export async function syncDevLoginAppUser(params: {
	userId: string;
	email: string;
	name: string;
	target: DevLoginTarget;
}): Promise<Pick<AuthUser, "id" | "email" | "name" | "role">> {
	if (params.target.mode === "existing_owner") {
		const synced = await syncAppUserFromBetterAuthSession({
			userId: params.userId,
			email: params.email,
			name: params.name,
		});

		return {
			id: synced.id,
			email: synced.email,
			name: params.name,
			role: params.target.appRole,
		};
	}

	const synced = await syncAppUserFromBetterAuthSession({
		userId: params.userId,
		email: params.email,
		name: params.name,
	});

	const hasOwner = await defaultBusinessHasActiveOwner();

	if (!hasOwner) {
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

	return synced;
}

/**
 * Signs in via Better Auth email/password (dev only) reusing an existing owner
 * when present, or creating the synthetic dev-owner account only if needed.
 */
export async function signInDevOwner(): Promise<
	Pick<AuthUser, "id" | "email" | "name" | "role">
> {
	assertDevAuthEnabled();

	const target = await resolveDevLoginTarget();
	const signInResult = await signInDevOwnerWithBetterAuth(target);

	return await syncDevLoginAppUser({
		userId: signInResult.user.id,
		email: signInResult.user.email,
		name: signInResult.user.name ?? target.name,
		target,
	});
}

/** @deprecated Use syncDevLoginAppUser — kept for tests documenting owner bootstrap. */
export async function syncDevOwnerAppUser(params: {
	userId: string;
	email: string;
	name: string;
}): Promise<Pick<AuthUser, "id" | "email" | "name" | "role">> {
	return await syncDevLoginAppUser({
		...params,
		target: {
			mode: "create_dev_owner",
			email: DEV_OWNER_EMAIL,
			name: DEV_OWNER_NAME,
			password: DEV_OWNER_PASSWORD,
		},
	});
}
