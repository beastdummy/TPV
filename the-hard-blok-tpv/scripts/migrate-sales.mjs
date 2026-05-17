/**
 * Sales foundations migration (Fase A).
 * Requires: businesses table (npm run db:migrate:tenancy)
 * Usage: node --env-file=.env ./scripts/migrate-sales.mjs
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
	const businessesExists = await client.query(
		`SELECT (to_regclass('public.businesses') IS NOT NULL) AS exists`,
	);

	if (!businessesExists.rows[0]?.exists) {
		throw new Error(
			"Falta la tabla businesses. Ejecuta antes: npm run db:migrate:tenancy",
		);
	}

	for (const file of [
		"002_sales_transaction_foundations.sql",
		"003_sales_cash_session_closing_amount.sql",
		"004_sale_payments_foundations.sql",
	]) {
		const ddlPath = join(root, "db/migrations", file);
		await client.query(readFileSync(ddlPath, "utf8"));
		console.log(`Applied DDL: db/migrations/${file}`);
	}

	const expectedTables = [
		"cash_sessions",
		"sales",
		"sale_items",
		"sale_idempotency_keys",
		"sale_payments",
	];

	const tables = await client.query(
		`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ANY($1::text[])
    ORDER BY table_name
    `,
		[expectedTables],
	);

	console.log(
		"Sales tables present:",
		tables.rows.map((row) => row.table_name).join(", "),
	);
} finally {
	client.release();
	await pool.end();
}
