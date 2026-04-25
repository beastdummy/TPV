import { randomBytes } from "node:crypto";

import { db } from "../../lib/db.server";
import { hashPassword } from "./password.server";
import type { AuthUser, Role } from "./types";

function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

function resolveDefaultRoleForNewUser(): Role {
	const configured = process.env.GOOGLE_DEFAULT_ROLE;

	if (
		configured === "owner" ||
		configured === "admin" ||
		configured === "manager" ||
		configured === "cashier"
	) {
		return configured;
	}

	return "cashier";
}

export async function syncAppUserFromBetterAuthSession(params: {
	userId: string;
	email: string;
	name: string;
}): Promise<Pick<AuthUser, "id" | "email" | "name" | "role">> {
	const email = normalizeEmail(params.email);
	const googleSub = params.userId;

	const existingByGoogle = await db.query<AuthUser>(
		`
    SELECT id, email, name, role, is_active
    FROM users
    WHERE google_sub = $1
    LIMIT 1
    `,
		[googleSub],
	);

	if (existingByGoogle.rows[0]) {
		const user = existingByGoogle.rows[0];

		await db.query(
			`
      UPDATE users
      SET
        email = $2,
        name = $3,
        updated_at = NOW()
      WHERE id = $1
      `,
			[user.id, email, params.name],
		);

		return {
			id: user.id,
			email,
			name: params.name,
			role: user.role,
		};
	}

	const existingByEmail = await db.query<AuthUser>(
		`
    SELECT id, email, name, role, is_active
    FROM users
    WHERE email = $1
    LIMIT 1
    `,
		[email],
	);

	if (existingByEmail.rows[0]) {
		const user = existingByEmail.rows[0];

		await db.query(
			`
      UPDATE users
      SET
        google_sub = $2,
        name = $3,
        updated_at = NOW()
      WHERE id = $1
      `,
			[user.id, googleSub, params.name],
		);

		return {
			id: user.id,
			email,
			name: params.name,
			role: user.role,
		};
	}

	const role = resolveDefaultRoleForNewUser();
	const randomPassword = randomBytes(32).toString("base64url");
	const passwordHash = hashPassword(randomPassword);

	const inserted = await db.query<{ id: string }>(
		`
    INSERT INTO users (name, email, password_hash, role, is_active, google_sub)
    VALUES ($1, $2, $3, $4, TRUE, $5)
    RETURNING id
    `,
		[params.name, email, passwordHash, role, googleSub],
	);

	const id = inserted.rows[0]?.id;

	if (!id) {
		throw new Error("No se pudo crear el usuario en la base de datos.");
	}

	return {
		id,
		email,
		name: params.name,
		role,
	};
}
