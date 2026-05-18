import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	query: vi.fn(),
}));

vi.mock("../../lib/db.server", () => ({
	db: { query: mocks.query },
}));

import {
	assertAppUsersTableExists,
	assertRegisterDatabaseReady,
} from "./ensure-app-db.server";

describe("ensure-app-db.server", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("throws DATABASE_NOT_READY when users table is missing", async () => {
		mocks.query.mockResolvedValueOnce({ rows: [{ exists: false }] });

		await expect(assertAppUsersTableExists()).rejects.toMatchObject({
			code: "DATABASE_NOT_READY",
		});
	});

	it("passes when users table exists", async () => {
		mocks.query.mockResolvedValueOnce({ rows: [{ exists: true }] });

		await expect(assertAppUsersTableExists()).resolves.toBeUndefined();
	});

	it("assertRegisterDatabaseReady requires users, businesses and Better Auth user", async () => {
		mocks.query.mockResolvedValueOnce({
			rows: [{ users: true, businesses: false, better_auth_user: true }],
		});

		await expect(assertRegisterDatabaseReady()).rejects.toMatchObject({
			code: "DATABASE_NOT_READY",
		});
	});
});
