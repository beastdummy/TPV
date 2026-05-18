import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	query: vi.fn(),
	signUpEmail: vi.fn(),
	getRequestHeaders: vi.fn(),
	getBusinessBySlug: vi.fn(),
}));

vi.mock("../../lib/db.server", () => ({
	db: { query: mocks.query },
}));

vi.mock("../../lib/auth.server", () => ({
	getAuth: () => ({
		api: { signUpEmail: mocks.signUpEmail },
	}),
}));

vi.mock("@tanstack/react-start/server", () => ({
	getRequestHeaders: mocks.getRequestHeaders,
}));

vi.mock("../tenancy/queries.server", () => ({
	getBusinessBySlug: mocks.getBusinessBySlug,
}));

import { registerCustomerOwner } from "./register-customer.server";

const validInput = {
	email: "owner@fresh.test",
	password: "password123",
	userName: "Owner Fresh",
	businessName: "Bar Fresh",
	posPin: "1234",
};

describe("fresh database install can register first business", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("fails with DATABASE_NOT_READY before Better Auth when users table is missing", async () => {
		mocks.getBusinessBySlug.mockResolvedValue(null);
		mocks.query.mockResolvedValueOnce({
			rows: [{ users: false, businesses: false, better_auth_user: false }],
		});

		await expect(registerCustomerOwner(validInput)).rejects.toMatchObject({
			code: "DATABASE_NOT_READY",
		});

		expect(mocks.signUpEmail).not.toHaveBeenCalled();
	});

	it("creates Better Auth user, app users row, business and owner member when schema is ready", async () => {
		mocks.getRequestHeaders.mockResolvedValue(new Headers());
		mocks.getBusinessBySlug.mockResolvedValue(null);
		mocks.signUpEmail.mockResolvedValue({
			user: { id: "ba-user-1" },
		});

		let inTransaction = false;
		mocks.query.mockImplementation(async (sql: string) => {
			const normalized = sql.replace(/\s+/g, " ").trim();

			if (normalized.startsWith("SELECT to_regclass")) {
				return {
					rows: [{ users: true, businesses: true, better_auth_user: true }],
				};
			}

			if (normalized.includes("FROM users") && normalized.includes("email")) {
				return { rows: [] };
			}

			if (normalized === "BEGIN") {
				inTransaction = true;
				return { rows: [] };
			}

			if (normalized === "COMMIT") {
				inTransaction = false;
				return { rows: [] };
			}

			if (normalized === "ROLLBACK") {
				inTransaction = false;
				return { rows: [] };
			}

			if (normalized.includes("INSERT INTO users")) {
				expect(inTransaction).toBe(true);
				return { rows: [{ id: "app-user-1" }] };
			}

			if (normalized.includes("INSERT INTO businesses")) {
				return {
					rows: [
						{
							id: "biz-1",
							slug: "bar-fresh",
							name: "Bar Fresh",
						},
					],
				};
			}

			if (
				normalized.includes("FROM business_members") &&
				normalized.includes("owner")
			) {
				return { rows: [] };
			}

			if (normalized.includes("INSERT INTO business_members")) {
				return { rows: [{ id: "mem-1" }] };
			}

			if (normalized.includes("INSERT INTO business_audit_logs")) {
				return { rows: [] };
			}

			throw new Error(`Unhandled SQL: ${normalized}`);
		});

		const result = await registerCustomerOwner(validInput);

		expect(mocks.signUpEmail).toHaveBeenCalled();
		expect(result.redirectTo).toBe("/setup");
		expect(result.user.id).toBe("app-user-1");
		expect(result.business.slug).toBeTruthy();
	});
});
