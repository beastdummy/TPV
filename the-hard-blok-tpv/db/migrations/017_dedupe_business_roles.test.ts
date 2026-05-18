import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
	join(dirname(fileURLToPath(import.meta.url)), "017_dedupe_business_roles.sql"),
	"utf8",
);

describe("017_dedupe_business_roles migration", () => {
	it("ensures unique business_id + slug and removes duplicate rows", () => {
		expect(migrationSql).toContain("business_roles_business_slug_uidx");
		expect(migrationSql).toContain("PARTITION BY business_id, slug");
		expect(migrationSql).toContain("row_num > 1");
	});
});
