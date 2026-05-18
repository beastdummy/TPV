import { APIError } from "better-auth/api";

import { getAuth } from "../../lib/auth.server";
import { db } from "../../lib/db.server";
import { getBusinessBySlug } from "../tenancy/queries.server";
import {
	normalizeBusinessSlug,
	SLUG_PATTERN,
	slugifyBusinessName,
} from "../tenancy/slug";
import { hashPassword } from "./password.server";
import { RegisterCustomerError } from "./register.errors";
import type { RegisterCustomerOwnerInput } from "./register-customer.schema";
import type { SessionUser } from "./types";

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

function isBetterAuthEmailTakenError(error: unknown): boolean {
	return (
		error instanceof APIError &&
		error.body?.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
	);
}

async function appUserEmailExists(email: string): Promise<boolean> {
	const result = await db.query<{ exists: number }>(
		`
    SELECT 1 AS exists
    FROM users
    WHERE email = $1
    LIMIT 1
    `,
		[email],
	);

	return Boolean(result.rows[0]);
}

async function pickAvailableSlug(baseSlug: string): Promise<string> {
	let candidate = baseSlug;
	let suffix = 2;

	while (await getBusinessBySlug(candidate)) {
		const suffixPart = `-${suffix}`;
		const trimmedBase = baseSlug.slice(0, Math.max(1, 48 - suffixPart.length));
		candidate = `${trimmedBase}${suffixPart}`;
		suffix += 1;
	}

	return candidate;
}

export async function resolveBusinessSlugForRegistration(params: {
	businessName: string;
	businessSlug?: string;
}): Promise<string> {
	if (params.businessSlug) {
		return normalizeBusinessSlug(params.businessSlug);
	}

	const base = slugifyBusinessName(params.businessName);

	if (!SLUG_PATTERN.test(base)) {
		throw new RegisterCustomerError(
			"INVALID_REGISTER_INPUT",
			"No se pudo generar un slug válido para el negocio.",
		);
	}

	return await pickAvailableSlug(base);
}

export type RegisterCustomerOwnerResult = {
	redirectTo: "/setup";
	user: SessionUser;
	business: {
		id: string;
		slug: string;
		name: string;
	};
};

export async function registerCustomerOwner(
	input: RegisterCustomerOwnerInput,
): Promise<RegisterCustomerOwnerResult> {
	const email = normalizeEmail(input.email);
	const businessName = input.businessName.trim();
	const userName = input.userName.trim();
	const businessSlug = await resolveBusinessSlugForRegistration({
		businessName,
		businessSlug: input.businessSlug,
	});

	if (await appUserEmailExists(email)) {
		throw new RegisterCustomerError(
			"EMAIL_ALREADY_EXISTS",
			"Ya existe una cuenta con este email.",
		);
	}

	if (input.businessSlug && (await getBusinessBySlug(businessSlug))) {
		throw new RegisterCustomerError(
			"BUSINESS_SLUG_ALREADY_EXISTS",
			"Ese slug de negocio ya está en uso.",
		);
	}

	const { getRequestHeaders } = await import("@tanstack/react-start/server");
	const headers = getRequestHeaders();
	const auth = getAuth();

	let betterAuthUserId: string;

	try {
		const signUpResult = await auth.api.signUpEmail({
			body: {
				email,
				password: input.password,
				name: userName,
			},
			headers,
		});

		if (!signUpResult?.user?.id) {
			throw new Error("No se pudo crear la cuenta de autenticación.");
		}

		betterAuthUserId = signUpResult.user.id;
	} catch (error) {
		if (isBetterAuthEmailTakenError(error)) {
			throw new RegisterCustomerError(
				"EMAIL_ALREADY_EXISTS",
				"Ya existe una cuenta con este email.",
			);
		}
		throw error;
	}

	const passwordHash = hashPassword(input.password);
	const posPinHash = hashPassword(input.posPin.trim());

	await db.query("BEGIN");

	try {
		const userInsert = await db.query<{ id: string }>(
			`
      INSERT INTO users (name, email, password_hash, role, is_active, google_sub)
      VALUES ($1, $2, $3, 'owner', TRUE, $4)
      RETURNING id
      `,
			[userName, email, passwordHash, betterAuthUserId],
		);

		const userId = userInsert.rows[0]?.id;

		if (!userId) {
			throw new Error("No se pudo crear el usuario de la aplicación.");
		}

		const businessInsert = await db.query<{
			id: string;
			slug: string;
			name: string;
		}>(
			`
      INSERT INTO businesses (slug, name, status)
      VALUES ($1, $2, 'active')
      RETURNING id, slug, name
      `,
			[businessSlug, businessName],
		);

		const business = businessInsert.rows[0];

		if (!business) {
			throw new Error("No se pudo crear el negocio.");
		}

		const ownerExists = await db.query<{ exists: number }>(
			`
      SELECT 1 AS exists
      FROM business_members
      WHERE business_id = $1
        AND role = 'owner'
        AND status = 'active'
      LIMIT 1
      `,
			[business.id],
		);

		if (ownerExists.rows[0]) {
			throw new RegisterCustomerError(
				"BUSINESS_SLUG_ALREADY_EXISTS",
				"Este negocio ya tiene un propietario.",
			);
		}

		const memberInsert = await db.query<{ id: string }>(
			`
      INSERT INTO business_members (
        business_id,
        user_id,
        role,
        status,
        is_primary,
        pos_pin_hash
      )
      VALUES ($1, $2, 'owner', 'active', TRUE, $3)
      RETURNING id
      `,
			[business.id, userId, posPinHash],
		);

		const membershipId = memberInsert.rows[0]?.id;

		await db.query("COMMIT");

		const { logBusinessAuditEvent } = await import(
			"../business-setup/audit.server"
		);
		const { BUSINESS_AUDIT_ACTIONS } = await import("../business-setup/types");

		await logBusinessAuditEvent({
			businessId: business.id,
			actorUserId: userId,
			actorMemberId: membershipId ?? null,
			action: BUSINESS_AUDIT_ACTIONS.BUSINESS_CREATED,
			entityType: "business",
			entityId: business.id,
			metadata: { name: business.name, slug: business.slug },
		});

		await logBusinessAuditEvent({
			businessId: business.id,
			actorUserId: userId,
			actorMemberId: membershipId ?? null,
			action: BUSINESS_AUDIT_ACTIONS.OWNER_REGISTERED,
			entityType: "business_member",
			entityId: membershipId ?? undefined,
			metadata: { email },
		});

		return {
			redirectTo: "/setup",
			user: {
				id: userId,
				email,
				name: userName,
				role: "owner",
			},
			business: {
				id: business.id,
				slug: business.slug,
				name: business.name,
			},
		};
	} catch (error) {
		await db.query("ROLLBACK");

		if (
			error &&
			typeof error === "object" &&
			"code" in error &&
			error.code === "23505"
		) {
			const detail = String(
				"detail" in error ? (error.detail as string | undefined) : "",
			);

			if (detail.includes("users") || detail.includes("email")) {
				throw new RegisterCustomerError(
					"EMAIL_ALREADY_EXISTS",
					"Ya existe una cuenta con este email.",
				);
			}

			if (detail.includes("businesses") || detail.includes("slug")) {
				throw new RegisterCustomerError(
					"BUSINESS_SLUG_ALREADY_EXISTS",
					"Ese slug de negocio ya está en uso.",
				);
			}

			if (detail.includes("business_members_one_owner")) {
				throw new RegisterCustomerError(
					"BUSINESS_SLUG_ALREADY_EXISTS",
					"Este negocio ya tiene un propietario.",
				);
			}
		}

		throw error;
	}
}
