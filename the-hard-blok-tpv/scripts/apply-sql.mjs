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

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(readFileSync(file, "utf8"));
await pool.end();
console.log(`Applied: ${file}`);
