import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	query: vi.fn(),
	ensureDefaultBusinessMembership: vi.fn(),
	hashPassword: vi.fn(),
}));

vi.mock("../../lib/db.server", () => ({
	db: { query: mocks.query },
}));

vi.mock("../tenancy/membership.server", () => ({
	ensureDefaultBusinessMembership: mocks.ensureDefaultBusinessMembership,
}));

vi.mock("./password.server", () => ({
	hashPassword: mocks.hashPassword,
}));

import { syncAppUserFromBetterAuthSession } from "./app-user.server";

describe("syncAppUserFromBetterAuthSession", () => {
	afterEach(() => {
		vi.clearAllMocks();
		delete process.env.GOOGLE_DEFAULT_ROLE;
	});

	it("ensures default membership for existing user by google_sub", async () => {
		mocks.query.mockResolvedValueOnce({
			rows: [
				{
					id: "user-1",
					email: "a@example.com",
					name: "Ada",
					role: "manager",
					is_active: true,
				},
			],
		});
		mocks.query.mockResolvedValueOnce({ rows: [] });
		mocks.ensureDefaultBusinessMembership.mockResolvedValue({});

		const result = await syncAppUserFromBetterAuthSession({
			userId: "google-1",
			email: "a@example.com",
			name: "Ada Lovelace",
		});

		expect(mocks.ensureDefaultBusinessMembership).toHaveBeenCalledWith({
			userId: "user-1",
			role: "manager",
			isActive: true,
		});
		expect(result).toEqual({
			id: "user-1",
			email: "a@example.com",
			name: "Ada Lovelace",
			role: "manager",
		});
	});

	it("ensures default membership for newly created user", async () => {
		mocks.query
			.mockResolvedValueOnce({ rows: [] })
			.mockResolvedValueOnce({ rows: [] });
		mocks.hashPassword.mockReturnValue("hash");
		mocks.query.mockResolvedValueOnce({ rows: [{ id: "user-new" }] });
		mocks.ensureDefaultBusinessMembership.mockResolvedValue({});

		process.env.GOOGLE_DEFAULT_ROLE = "cashier";

		const result = await syncAppUserFromBetterAuthSession({
			userId: "google-new",
			email: "new@example.com",
			name: "New User",
		});

		expect(mocks.ensureDefaultBusinessMembership).toHaveBeenCalledWith({
			userId: "user-new",
			role: "cashier",
			isActive: true,
		});
		expect(result.role).toBe("cashier");
	});
});
