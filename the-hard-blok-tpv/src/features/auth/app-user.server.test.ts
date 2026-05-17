import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	query: vi.fn(),
	hashPassword: vi.fn(),
}));

vi.mock("../../lib/db.server", () => ({
	db: { query: mocks.query },
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

	it("syncs existing user by google_sub without creating business membership", async () => {
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

		const result = await syncAppUserFromBetterAuthSession({
			userId: "google-1",
			email: "a@example.com",
			name: "Ada Lovelace",
		});

		expect(mocks.query).toHaveBeenCalledTimes(2);
		expect(result).toEqual({
			id: "user-1",
			email: "a@example.com",
			name: "Ada Lovelace",
			role: "manager",
		});
	});

	it("creates new user without default business membership", async () => {
		mocks.query
			.mockResolvedValueOnce({ rows: [] })
			.mockResolvedValueOnce({ rows: [] });
		mocks.hashPassword.mockReturnValue("hash");
		mocks.query.mockResolvedValueOnce({ rows: [{ id: "user-new" }] });

		process.env.GOOGLE_DEFAULT_ROLE = "cashier";

		const result = await syncAppUserFromBetterAuthSession({
			userId: "google-new",
			email: "new@example.com",
			name: "New User",
		});

		expect(mocks.query).toHaveBeenCalledTimes(3);
		expect(
			mocks.query.mock.calls.some(([sql]) =>
				String(sql).includes("INSERT INTO business_members"),
			),
		).toBe(false);
		expect(result.role).toBe("cashier");
	});
});
