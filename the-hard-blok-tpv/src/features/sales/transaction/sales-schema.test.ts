import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
	CASH_SESSION_STATUSES,
	SALE_IDEMPOTENT_OPERATIONS,
	SALE_PAYMENT_METHODS,
	SALE_STATUSES,
} from "./types";

const migrationSql = readFileSync(
	join(process.cwd(), "db/migrations/002_sales_transaction_foundations.sql"),
	"utf8",
);

describe("sales schema foundations (Fase A)", () => {
	it("includes closing_amount on cash_sessions", () => {
		expect(migrationSql).toContain("closing_amount NUMERIC(12, 2)");
	});

	it("defines core tables in migration SQL", () => {
		expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS cash_sessions");
		expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS sales");
		expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS sale_items");
		expect(migrationSql).toContain(
			"CREATE TABLE IF NOT EXISTS sale_idempotency_keys",
		);
	});

	it("enforces receipt_number unique per business", () => {
		expect(migrationSql).toContain("receipt_number BIGINT NOT NULL");
		expect(migrationSql).toContain(
			"CONSTRAINT sales_business_receipt_number_uidx",
		);
		expect(migrationSql).toContain("UNIQUE (business_id, receipt_number)");
	});

	it("enforces idempotency unique per business", () => {
		expect(migrationSql).toContain(
			"CONSTRAINT sale_idempotency_keys_business_key_uidx",
		);
		expect(migrationSql).toContain("UNIQUE (business_id, idempotency_key)");
	});

	it("indexes sales by business, session and status", () => {
		expect(migrationSql).toContain("sales_business_created_at_idx");
		expect(migrationSql).toContain("sales_business_status_idx");
		expect(migrationSql).toContain("sales_cash_session_idx");
	});

	it("aligns TypeScript sale statuses with SQL CHECK", () => {
		for (const status of SALE_STATUSES) {
			expect(migrationSql).toContain(`'${status}'`);
		}
	});

	it("aligns cash session statuses with SQL CHECK", () => {
		for (const status of CASH_SESSION_STATUSES) {
			expect(migrationSql).toContain(`'${status}'`);
		}
	});

	it("aligns payment methods with SQL CHECK", () => {
		for (const method of SALE_PAYMENT_METHODS) {
			expect(migrationSql).toContain(`'${method}'`);
		}
	});

	it("aligns idempotent operations with SQL CHECK", () => {
		for (const operation of SALE_IDEMPOTENT_OPERATIONS) {
			expect(migrationSql).toContain(`'${operation}'`);
		}
	});
});
