import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
	join(process.cwd(), "db/migrations/007_platform_roles.sql"),
	"utf8",
);

describe("007 platform roles migration", () => {
	it("migrates legacy platform_* roles to short names", () => {
		expect(migrationSql).toContain("platform_owner");
		expect(migrationSql).toContain("SET role = 'owner'");
		expect(migrationSql).toContain("'dev'");
		expect(migrationSql).toContain("'billing'");
		expect(migrationSql).toContain("'viewer'");
	});
});
