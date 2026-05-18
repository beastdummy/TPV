/**
 * Apply a .sql file using DATABASE_URL (use with: node --env-file=.env ...)
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const file = process.argv[2];
if (!file) {
	console.error("Usage: node --env-file=.env scripts/apply-sql.mjs <path-to.sql>");
	process.exit(1);
}

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL is not set");
}

const sql = readFileSync(file, "utf8");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
	await pool.query(sql);
	console.log(`Applied: ${file}`);
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`Failed applying ${file}: ${message}`);
	console.error(
		"Si falló db/schema.sql, revisa que no haya FK a tablas de migraciones posteriores (p. ej. businesses).",
	);
	throw error;
} finally {
	await pool.end();
}
