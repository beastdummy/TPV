import { Pool } from "pg";

const email = process.argv[2];
const role = process.argv[3];

if (!email || !role) {
	console.error("Uso: node --env-file=.env scripts/set-user-role.mjs <email> <role>");
	process.exit(1);
}

const validRoles = new Set(["owner", "admin", "manager", "cashier"]);
if (!validRoles.has(role)) {
	console.error(`Rol inválido: ${role}`);
	process.exit(1);
}

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

try {
	await pool.query("UPDATE users SET role = $1 WHERE email = $2", [role, email]);
	const result = await pool.query(
		"SELECT email, role, google_sub FROM users WHERE email = $1",
		[email],
	);
	console.table(result.rows);
} finally {
	await pool.end();
}
