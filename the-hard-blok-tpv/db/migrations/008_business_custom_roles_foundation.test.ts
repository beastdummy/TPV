import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
	join(
		process.cwd(),
		"db/migrations/008_business_custom_roles_foundation.sql",
	),
	"utf8",
);

describe("008 business custom roles foundation", () => {
	it("creates business_roles and business_role_permissions", () => {
		expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS business_roles");
		expect(migrationSql).toContain(
			"CREATE TABLE IF NOT EXISTS business_role_permissions",
		);
		expect(migrationSql).toContain(
			"DROP CONSTRAINT IF EXISTS business_members_role_check",
		);
		expect(migrationSql).toContain("pg_constraint");
		expect(migrationSql).toContain(
			"business_members_role_nonempty_check",
		);
	});
});
