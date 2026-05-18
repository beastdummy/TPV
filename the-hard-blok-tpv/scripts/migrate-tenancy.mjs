/**
 * Tenancy migration: DDL only (no business bootstrap).
 * Usage: node --env-file=.env ./scripts/migrate-tenancy.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL is not set");
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

try {
	const usersExists = await client.query(
		`SELECT (to_regclass('public.users') IS NOT NULL) AS exists`,
	);

	if (!usersExists.rows[0]?.exists) {
		console.warn(
			"Tabla users ausente; aplicando 000_app_users_foundations.sql primero.",
		);
	}

	for (const file of [
		"000_app_users_foundations.sql",
		"001_tenancy_foundations.sql",
		"006_business_members_one_owner_per_business_uidx.sql",
		"008_business_custom_roles_foundation.sql",
		"010_business_staff_permissions.sql",
		"012_pos_operator_sessions.sql",
		"013_business_setup_audit.sql",
		"014_setup_business_confirmed_at.sql",
		"015_warehouses_is_default.sql",
		"016_inventory_hospitality.sql",
	]) {
		const ddlPath = join(root, "db/migrations", file);
		await client.query(readFileSync(ddlPath, "utf8"));
		console.log(`Applied DDL: db/migrations/${file}`);
	}

	console.log("Tenancy DDL OK (sin bootstrap de negocios).");
} finally {
	client.release();
	await pool.end();
}
