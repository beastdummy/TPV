import { db } from "../../lib/db.server";
import { RegisterCustomerError } from "./register.errors";

const BOOTSTRAP_HINT =
	"Base de datos incompleta. Ejecuta: npm run db:bootstrap (o npm run db:schema && npm run db:auth-migrate && npm run db:migrate:platform && npm run db:migrate:tenancy && npm run db:migrate:catalog && npm run db:migrate:sales && npm run db:migrate:inventory)";

export async function assertAppUsersTableExists(): Promise<void> {
	const result = await db.query<{ exists: boolean }>(
		`
    SELECT to_regclass('public.users') IS NOT NULL AS exists
    `,
	);

	if (!result.rows[0]?.exists) {
		throw new RegisterCustomerError("DATABASE_NOT_READY", BOOTSTRAP_HINT);
	}
}

export async function assertRegisterDatabaseReady(): Promise<void> {
	const result = await db.query<{
		users: boolean;
		businesses: boolean;
		better_auth_user: boolean;
	}>(
		`
    SELECT
      to_regclass('public.users') IS NOT NULL AS users,
      to_regclass('public.businesses') IS NOT NULL AS businesses,
      to_regclass('public."user"') IS NOT NULL AS better_auth_user
    `,
	);

	const row = result.rows[0];
	if (!row?.users || !row?.businesses || !row?.better_auth_user) {
		throw new RegisterCustomerError("DATABASE_NOT_READY", BOOTSTRAP_HINT);
	}
}
