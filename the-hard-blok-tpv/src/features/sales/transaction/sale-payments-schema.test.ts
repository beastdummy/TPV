import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
	SALE_PAYMENT_METHODS,
	SALE_PAYMENT_PROVIDERS,
	SALE_PAYMENT_STATUSES,
} from "./types";

const migrationSql = readFileSync(
	join(process.cwd(), "db/migrations/004_sale_payments_foundations.sql"),
	"utf8",
);

describe("sale_payments schema foundations", () => {
	it("defines sale_payments table with required columns", () => {
		expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS sale_payments");
		expect(migrationSql).toContain("sale_id UUID NOT NULL REFERENCES sales");
		expect(migrationSql).toContain(
			"business_id UUID NOT NULL REFERENCES businesses",
		);
		expect(migrationSql).toContain("payment_method TEXT NOT NULL");
		expect(migrationSql).toContain("amount NUMERIC(12, 2) NOT NULL");
		expect(migrationSql).toContain("currency CHAR(3) NOT NULL DEFAULT 'EUR'");
		expect(migrationSql).toContain("status TEXT NOT NULL");
		expect(migrationSql).toContain("provider TEXT NOT NULL");
		expect(migrationSql).toContain("provider_reference TEXT");
		expect(migrationSql).toContain("processed_at TIMESTAMPTZ");
	});

	it("indexes payments by sale and business status", () => {
		expect(migrationSql).toContain("sale_payments_sale_id_idx");
		expect(migrationSql).toContain("sale_payments_business_status_idx");
		expect(migrationSql).toContain("sale_payments_business_sale_idx");
	});

	it("aligns payment statuses with TypeScript", () => {
		for (const status of SALE_PAYMENT_STATUSES) {
			expect(migrationSql).toContain(`'${status}'`);
		}
	});

	it("aligns payment methods with TypeScript", () => {
		for (const method of SALE_PAYMENT_METHODS) {
			expect(migrationSql).toContain(`'${method}'`);
		}
	});

	it("aligns internal provider with TypeScript", () => {
		for (const provider of SALE_PAYMENT_PROVIDERS) {
			expect(migrationSql).toContain(`'${provider}'`);
		}
	});
});
