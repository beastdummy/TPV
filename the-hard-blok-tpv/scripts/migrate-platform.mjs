/**
 * Platform admins migration.
 * Requires: users (db/schema.sql)
 * Usage: node --env-file=.env ./scripts/migrate-platform.mjs
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
		throw new Error(
			"Falta la tabla users. Ejecuta antes: npm run db:schema",
		);
	}

	for (const file of [
		"005_platform_admins.sql",
		"007_platform_roles.sql",
	]) {
		const ddlPath = join(root, "db/migrations", file);
		await client.query(readFileSync(ddlPath, "utf8"));
		console.log(`Applied DDL: db/migrations/${file}`);
	}
} finally {
	client.release();
	await pool.end();
}
