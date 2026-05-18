import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	query: vi.fn(),
	signUpEmail: vi.fn(),
	getRequestHeaders: vi.fn(),
}));

vi.mock("../../lib/db.server", () => ({
	db: { query: mocks.query },
}));

vi.mock("../../lib/auth.server", () => ({
	getAuth: () => ({
		api: {
			signUpEmail: mocks.signUpEmail,
		},
	}),
}));

vi.mock("@tanstack/react-start/server", () => ({
	getRequestHeaders: mocks.getRequestHeaders,
}));

vi.mock("../tenancy/queries.server", () => ({
	getBusinessBySlug: vi.fn(),
}));

vi.mock("../business-setup/audit.server", () => ({
	logBusinessAuditEvent: vi.fn(),
}));

import { RegisterCustomerError } from "../auth/register.errors";
import { registerCustomerOwner } from "../auth/register-customer.server";
import { getBusinessBySlug } from "./queries.server";

const validInput = {
	userName: "New Owner",
	email: "new@example.com",
	password: "password123",
	businessName: "New Cafe",
	businessSlug: "new-cafe",
	posPin: "5678",
};

const migrationSql = readFileSync(
	join(
		process.cwd(),
		"db/migrations/006_business_members_one_owner_per_business_uidx.sql",
	),
	"utf8",
);

describe("business_members_one_owner_uidx migration", () => {
	it("scopes the unique index to business_id for active owners", () => {
		expect(migrationSql).toContain(
			"DROP INDEX IF EXISTS business_members_one_owner_uidx",
		);
		expect(migrationSql).toContain(
			"CREATE UNIQUE INDEX business_members_one_owner_uidx",
		);
		expect(migrationSql).toMatch(
			/ON business_members \(business_id\)\s+WHERE role = 'owner' AND status = 'active'/s,
		);
	});
});

describe("register owner membership (multi-tenant)", () => {
	afterEach(() => {
		vi.resetAllMocks();
	});

	it("allows an owner in business B when business A already has an active owner", async () => {
		mocks.getRequestHeaders.mockReturnValue(new Headers());
		vi.mocked(getBusinessBySlug).mockResolvedValue(null);
		mocks.signUpEmail.mockResolvedValue({
			user: {
				id: "ba-new",
				email: validInput.email,
				name: validInput.userName,
			},
		});

		mocks.query.mockImplementation(async (sql: string) => {
			if (sql.includes("FROM users") && sql.includes("email")) {
				return { rows: [] };
			}
			if (sql === "BEGIN" || sql === "COMMIT") {
				return { rows: [] };
			}
			if (sql.includes("INSERT INTO users")) {
				return { rows: [{ id: "user-new" }] };
			}
			if (sql.includes("INSERT INTO businesses")) {
				return {
					rows: [
						{
							id: "biz-b",
							slug: "new-cafe",
							name: "New Cafe",
						},
					],
				};
			}
			if (sql.includes("FROM business_members") && sql.includes("owner")) {
				return { rows: [] };
			}
			if (sql.includes("INSERT INTO business_members")) {
				return { rows: [] };
			}
			return { rows: [] };
		});

		const result = await registerCustomerOwner(validInput);

		expect(result.user.role).toBe("owner");
		expect(
			mocks.query.mock.calls.some(
				([sql, params]) =>
					typeof sql === "string" &&
					sql.includes("INSERT INTO business_members") &&
					Array.isArray(params) &&
					params[0] === "biz-b" &&
					params[1] === "user-new" &&
					typeof params[2] === "string",
			),
		).toBe(true);
	});

	it("blocks a second active owner in the same business", async () => {
		mocks.getRequestHeaders.mockReturnValue(new Headers());
		vi.mocked(getBusinessBySlug).mockResolvedValue(null);
		mocks.signUpEmail.mockResolvedValue({
			user: { id: "ba-2", email: "other@example.com", name: "Other" },
		});

		mocks.query.mockImplementation(async (sql: string) => {
			if (sql.includes("FROM users") && sql.includes("email")) {
				return { rows: [] };
			}
			if (sql === "BEGIN") {
				return { rows: [] };
			}
			if (sql.includes("INSERT INTO users")) {
				return { rows: [{ id: "user-2" }] };
			}
			if (sql.includes("INSERT INTO businesses")) {
				return {
					rows: [{ id: "biz-a", slug: "cafe-a", name: "Cafe A" }],
				};
			}
			if (sql.includes("FROM business_members") && sql.includes("owner")) {
				return { rows: [{ exists: 1 }] };
			}
			if (sql === "ROLLBACK") {
				return { rows: [] };
			}
			return { rows: [] };
		});

		await expect(
			registerCustomerOwner({
				...validInput,
				email: "other@example.com",
				businessSlug: "cafe-a",
			}),
		).rejects.toMatchObject({
			code: "BUSINESS_SLUG_ALREADY_EXISTS",
		});
	});

	it("maps unique index violation on same business to BUSINESS_SLUG_ALREADY_EXISTS", async () => {
		mocks.getRequestHeaders.mockReturnValue(new Headers());
		vi.mocked(getBusinessBySlug).mockResolvedValue(null);
		mocks.signUpEmail.mockResolvedValue({
			user: { id: "ba-3", email: "race@example.com", name: "Race" },
		});

		mocks.query.mockImplementation(async (sql: string) => {
			if (sql.includes("FROM users") && sql.includes("email")) {
				return { rows: [] };
			}
			if (sql === "BEGIN") {
				return { rows: [] };
			}
			if (sql.includes("INSERT INTO users")) {
				return { rows: [{ id: "user-3" }] };
			}
			if (sql.includes("INSERT INTO businesses")) {
				return {
					rows: [{ id: "biz-a", slug: "cafe-a", name: "Cafe A" }],
				};
			}
			if (sql.includes("FROM business_members") && sql.includes("owner")) {
				return { rows: [] };
			}
			if (sql.includes("INSERT INTO business_members")) {
				const error = new Error("duplicate key") as Error & {
					code: string;
					detail: string;
				};
				error.code = "23505";
				error.detail =
					"Key (business_id)=(biz-a) already exists on business_members_one_owner_uidx";
				throw error;
			}
			if (sql === "ROLLBACK") {
				return { rows: [] };
			}
			return { rows: [] };
		});

		await expect(
			registerCustomerOwner({
				...validInput,
				email: "race@example.com",
				businessSlug: "cafe-a",
			}),
		).rejects.toBeInstanceOf(RegisterCustomerError);
	});
});
