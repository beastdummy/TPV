/**
 * Inventory hospitality migration (016).
 * Usage: node --env-file=.env ./scripts/migrate-inventory.mjs
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
	const ddlPath = join(root, "db/migrations/016_inventory_hospitality.sql");
	await client.query(readFileSync(ddlPath, "utf8"));
	console.log("Applied DDL: db/migrations/016_inventory_hospitality.sql");
	console.log("Inventory hospitality DDL OK.");
} finally {
	client.release();
	await pool.end();
}
