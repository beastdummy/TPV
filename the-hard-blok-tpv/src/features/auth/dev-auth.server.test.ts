import { APIError } from "better-auth/api";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	syncAppUserFromBetterAuthSession: vi.fn(),
	ensureDefaultBusinessMembership: vi.fn(),
	query: vi.fn(),
	signUpEmail: vi.fn(),
	signInEmail: vi.fn(),
	getRequestHeaders: vi.fn(),
}));

vi.mock("../../lib/db.server", () => ({
	db: { query: mocks.query },
}));

vi.mock("../../lib/auth.server", () => ({
	getAuth: () => ({
		api: {
			signUpEmail: mocks.signUpEmail,
			signInEmail: mocks.signInEmail,
		},
	}),
}));

vi.mock("@tanstack/react-start/server", () => ({
	getRequestHeaders: mocks.getRequestHeaders,
}));

vi.mock("./app-user.server", () => ({
	syncAppUserFromBetterAuthSession: mocks.syncAppUserFromBetterAuthSession,
}));

vi.mock("../tenancy/membership.server", () => ({
	ensureDefaultBusinessMembership: mocks.ensureDefaultBusinessMembership,
}));

import {
	assertDevAuthEnabled,
	DEV_OWNER_EMAIL,
	DEV_OWNER_NAME,
	DEV_OWNER_ROLE,
	isDevAuthEnabled,
	signInDevOwner,
	syncDevOwnerAppUser,
} from "./dev-auth.server";

describe("dev auth", () => {
	const originalNodeEnv = process.env.NODE_ENV;

	afterEach(() => {
		process.env.NODE_ENV = originalNodeEnv;
		vi.clearAllMocks();
	});

	it("is disabled in production", () => {
		process.env.NODE_ENV = "production";
		expect(isDevAuthEnabled()).toBe(false);
		expect(() => assertDevAuthEnabled()).toThrow("DEV_AUTH_DISABLED");
	});

	it("is enabled outside production", () => {
		process.env.NODE_ENV = "development";
		expect(isDevAuthEnabled()).toBe(true);
		expect(() => assertDevAuthEnabled()).not.toThrow();
	});

	it("syncDevOwnerAppUser forces owner role and default membership", async () => {
		mocks.syncAppUserFromBetterAuthSession.mockResolvedValue({
			id: "user-dev",
			email: DEV_OWNER_EMAIL,
			name: DEV_OWNER_NAME,
			role: "cashier",
		});
		mocks.query.mockResolvedValue({ rows: [] });
		mocks.ensureDefaultBusinessMembership.mockResolvedValue({});

		const result = await syncDevOwnerAppUser({
			userId: "ba-user-1",
			email: DEV_OWNER_EMAIL,
			name: DEV_OWNER_NAME,
		});

		expect(mocks.query).toHaveBeenCalledWith(
			expect.stringContaining("SET role = $2"),
			["user-dev", DEV_OWNER_ROLE, DEV_OWNER_NAME],
		);
		expect(mocks.ensureDefaultBusinessMembership).toHaveBeenCalledWith({
			userId: "user-dev",
			role: DEV_OWNER_ROLE,
			isActive: true,
		});
		expect(result).toEqual({
			id: "user-dev",
			email: DEV_OWNER_EMAIL,
			name: DEV_OWNER_NAME,
			role: DEV_OWNER_ROLE,
		});
	});

	it("signInDevOwner signs up when needed and syncs dev owner", async () => {
		process.env.NODE_ENV = "development";
		mocks.getRequestHeaders.mockReturnValue(new Headers());
		mocks.signUpEmail.mockRejectedValue(
			new APIError("UNPROCESSABLE_ENTITY", {
				code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
				message: "exists",
			}),
		);
		mocks.signInEmail.mockResolvedValue({
			user: {
				id: "ba-dev",
				email: DEV_OWNER_EMAIL,
				name: DEV_OWNER_NAME,
			},
		});
		mocks.syncAppUserFromBetterAuthSession.mockResolvedValue({
			id: "user-dev",
			email: DEV_OWNER_EMAIL,
			name: DEV_OWNER_NAME,
			role: "cashier",
		});
		mocks.query.mockResolvedValue({ rows: [] });
		mocks.ensureDefaultBusinessMembership.mockResolvedValue({});

		const result = await signInDevOwner();

		expect(mocks.signUpEmail).toHaveBeenCalled();
		expect(mocks.signInEmail).toHaveBeenCalledWith({
			body: {
				email: DEV_OWNER_EMAIL,
				password: "dev-owner-local-only",
			},
			headers: expect.any(Headers),
		});
		expect(result.role).toBe(DEV_OWNER_ROLE);
	});

	it("signInDevOwner rejects in production", async () => {
		process.env.NODE_ENV = "production";

		await expect(signInDevOwner()).rejects.toThrow("DEV_AUTH_DISABLED");
	});
});
