/**
 * Bootstrap completo tras reset de BD (docker compose down -v).
 * Usage: node --env-file=.env ./scripts/bootstrap-database.mjs
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL is not set");
}

function runNodeScript(relativePath, args = []) {
	return new Promise((resolve, reject) => {
		const child = spawn(
			process.execPath,
			["--env-file=.env", join(root, relativePath), ...args],
			{
				cwd: root,
				stdio: "inherit",
				env: process.env,
			},
		);
		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`${relativePath} exited with code ${code}`));
			}
		});
	});
}

async function applySqlFile(client, relativePath) {
	const ddlPath = join(root, relativePath);
	await client.query(readFileSync(ddlPath, "utf8"));
	console.log(`Applied: ${relativePath}`);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

try {
	console.log("1/7 db:schema (app catalog + users)");
	await applySqlFile(client, "db/schema.sql");

	console.log("2/7 db:auth-migrate (Better Auth user/session/account/verification)");
	await runNodeScript("node_modules/auth/dist/index.mjs", [
		"migrate",
		"-y",
		"--config",
		"./src/lib/auth.config.ts",
	]);

	console.log("3/7 db:migrate:platform");
	await runNodeScript("scripts/migrate-platform.mjs");

	console.log("4/7 db:migrate:tenancy");
	await runNodeScript("scripts/migrate-tenancy.mjs");

	console.log("5/7 db:migrate:catalog");
	await applySqlFile(client, "db/migrations/009_categories_image_url.sql");

	console.log("6/7 db:migrate:sales");
	await runNodeScript("scripts/migrate-sales.mjs");

	console.log("7/7 db:migrate:inventory");
	await runNodeScript("scripts/migrate-inventory.mjs");

	const checks = await client.query(`
    SELECT
      to_regclass('public.users') IS NOT NULL AS app_users,
      to_regclass('public."user"') IS NOT NULL AS better_auth_user,
      to_regclass('public.businesses') IS NOT NULL AS businesses,
      to_regclass('public.business_members') IS NOT NULL AS business_members
  `);

	const row = checks.rows[0];
	if (!row?.app_users || !row?.better_auth_user || !row?.businesses) {
		throw new Error(
			`Bootstrap incompleto: ${JSON.stringify(row)}`,
		);
	}

	console.log("Bootstrap OK — listo para /register");
} finally {
	client.release();
	await pool.end();
}
