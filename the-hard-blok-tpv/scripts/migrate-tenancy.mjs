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
	for (const file of [
		"001_tenancy_foundations.sql",
		"006_business_members_one_owner_per_business_uidx.sql",
	]) {
		const ddlPath = join(root, "db/migrations", file);
		await client.query(readFileSync(ddlPath, "utf8"));
		console.log(`Applied DDL: db/migrations/${file}`);
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

	const defaultOwner = await client.query(
		`
    SELECT id
    FROM users
    WHERE role = 'owner' AND is_active = TRUE
    ORDER BY created_at ASC
    LIMIT 1
    `,
	);
	const defaultOwnerId = defaultOwner.rows[0]?.id ?? null;

	let members = { rowCount: 0 };

	if (defaultOwnerId) {
		await client.query(
			`
      INSERT INTO business_members (business_id, user_id, role, status, is_primary)
      VALUES ($1::uuid, $2::uuid, 'owner', 'active', TRUE)
      ON CONFLICT (business_id, user_id) DO UPDATE
      SET role = 'owner', status = 'active', updated_at = NOW()
      `,
			[businessId, defaultOwnerId],
		);
	}

	members = await client.query(
		`
    INSERT INTO business_members (business_id, user_id, role, status, is_primary)
    SELECT
      $1::uuid,
      u.id,
      CASE
        WHEN u.role = 'owner' AND u.id = $2::uuid THEN 'owner'
        WHEN u.role = 'owner' THEN 'manager'
        ELSE u.role
      END,
      CASE WHEN u.is_active THEN 'active' ELSE 'suspended' END,
      TRUE
    FROM users u
    WHERE NOT EXISTS (
      SELECT 1 FROM business_members bm WHERE bm.user_id = u.id
    )
    ON CONFLICT (business_id, user_id) DO NOTHING
    RETURNING id
    `,
		[businessId, defaultOwnerId],
	);

	console.log(
		`Tenancy backfill OK — business "${config.slug}" (${businessId}), ${members.rowCount} membership(s)`,
	);
} finally {
	client.release();
	await pool.end();
}
