/**
 * Tenancy migration: DDL + backfill idempotente (DEFAULT_BUSINESS_* desde .env).
 * Usage: node --env-file=.env ./scripts/migrate-tenancy.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function getDefaultBusinessConfig() {
	const slug = (process.env.DEFAULT_BUSINESS_SLUG ?? "default").trim();
	const name = (process.env.DEFAULT_BUSINESS_NAME ?? "The Hard Blok").trim();

	if (!SLUG_PATTERN.test(slug)) {
		throw new Error(
			`DEFAULT_BUSINESS_SLUG inválido: "${slug}". Use solo a-z, 0-9 y guiones.`,
		);
	}
	if (!name) {
		throw new Error("DEFAULT_BUSINESS_NAME no puede estar vacío.");
	}

	return { slug, name };
}

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL is not set");
}

const config = getDefaultBusinessConfig();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

try {
	const ddlPath = join(root, "db/migrations/001_tenancy_foundations.sql");
	await client.query(readFileSync(ddlPath, "utf8"));
	console.log("Applied DDL: db/migrations/001_tenancy_foundations.sql");

	const owners = await client.query(
		`
    SELECT COUNT(*)::int AS n
    FROM users
    WHERE role = 'owner' AND is_active = TRUE
    `,
	);

	if (owners.rows[0].n > 1) {
		throw new Error(
			`Hay ${owners.rows[0].n} usuarios owner activos. Deja solo uno antes de migrar tenancy.`,
		);
	}

	await client.query(
		`
    INSERT INTO businesses (slug, name, status)
    VALUES ($1, $2, 'active')
    ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name, updated_at = NOW()
    `,
		[config.slug, config.name],
	);

	const business = await client.query(
		`SELECT id FROM businesses WHERE slug = $1 LIMIT 1`,
		[config.slug],
	);
	const businessId = business.rows[0]?.id;

	if (!businessId) {
		throw new Error("No se pudo resolver el negocio default tras INSERT.");
	}

	const members = await client.query(
		`
    INSERT INTO business_members (business_id, user_id, role, status, is_primary)
    SELECT
      $1::uuid,
      u.id,
      u.role,
      CASE WHEN u.is_active THEN 'active' ELSE 'suspended' END,
      TRUE
    FROM users u
    ON CONFLICT (business_id, user_id) DO UPDATE
    SET
      role = EXCLUDED.role,
      status = EXCLUDED.status,
      is_primary = TRUE,
      updated_at = NOW()
    RETURNING id
    `,
		[businessId],
	);

	console.log(
		`Tenancy backfill OK — business "${config.slug}" (${businessId}), ${members.rowCount} membership(s)`,
	);
} finally {
	client.release();
	await pool.end();
}
