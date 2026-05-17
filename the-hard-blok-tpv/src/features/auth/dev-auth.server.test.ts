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
	PREFERRED_DEV_OWNER_EMAIL,
	resolveDevLoginTarget,
	signInDevOwner,
	syncDevLoginAppUser,
	syncDevOwnerAppUser,
} from "./dev-auth.server";

function mockAppUserQuery(rows: unknown[]) {
	mocks.query.mockResolvedValueOnce({ rows });
}

function mockOwnerExists(exists: boolean) {
	mocks.query.mockResolvedValueOnce({ rows: exists ? [{ exists: 1 }] : [] });
}

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

	it("resolveDevLoginTarget prefers admin@thehardblok.local", async () => {
		mockAppUserQuery([
			{
				id: "admin-1",
				email: PREFERRED_DEV_OWNER_EMAIL,
				name: "Admin The Hard Blok",
				role: "owner",
				is_active: true,
			},
		]);

		const target = await resolveDevLoginTarget();

		expect(target).toEqual({
			mode: "existing_owner",
			email: PREFERRED_DEV_OWNER_EMAIL,
			name: "Admin The Hard Blok",
			password: "Admin1234!",
			appUserId: "admin-1",
			appRole: "owner",
		});
	});

	it("syncDevOwnerAppUser bootstraps owner only when business has no owner", async () => {
		mocks.syncAppUserFromBetterAuthSession.mockResolvedValue({
			id: "user-dev",
			email: DEV_OWNER_EMAIL,
			name: DEV_OWNER_NAME,
			role: "cashier",
		});
		mockOwnerExists(false);
		mocks.query.mockResolvedValueOnce({ rows: [] });
		mocks.ensureDefaultBusinessMembership.mockResolvedValue({});

		const result = await syncDevOwnerAppUser({
			userId: "ba-user-1",
			email: DEV_OWNER_EMAIL,
			name: DEV_OWNER_NAME,
		});

		expect(mocks.ensureDefaultBusinessMembership).toHaveBeenCalledWith({
			userId: "user-dev",
			role: DEV_OWNER_ROLE,
			isActive: true,
		});
		expect(result.role).toBe(DEV_OWNER_ROLE);
	});

	it("reuses existing admin owner without creating dev-owner account", async () => {
		process.env.NODE_ENV = "development";
		mocks.getRequestHeaders.mockReturnValue(new Headers());
		mockAppUserQuery([
			{
				id: "admin-1",
				email: PREFERRED_DEV_OWNER_EMAIL,
				name: "Admin The Hard Blok",
				role: "owner",
				is_active: true,
			},
		]);
		mocks.signInEmail.mockResolvedValue({
			user: {
				id: "ba-admin",
				email: PREFERRED_DEV_OWNER_EMAIL,
				name: "Admin The Hard Blok",
			},
		});
		mocks.syncAppUserFromBetterAuthSession.mockResolvedValue({
			id: "admin-1",
			email: PREFERRED_DEV_OWNER_EMAIL,
			name: "Admin The Hard Blok",
			role: "owner",
		});

		const result = await signInDevOwner();

		expect(mocks.signUpEmail).not.toHaveBeenCalled();
		expect(mocks.signInEmail).toHaveBeenCalledWith({
			body: {
				email: PREFERRED_DEV_OWNER_EMAIL,
				password: "Admin1234!",
			},
			headers: expect.any(Headers),
		});
		expect(mocks.ensureDefaultBusinessMembership).not.toHaveBeenCalled();
		expect(result).toEqual({
			id: "admin-1",
			email: PREFERRED_DEV_OWNER_EMAIL,
			name: "Admin The Hard Blok",
			role: "owner",
		});
	});

	it("does not create a second owner membership when reusing admin", async () => {
		process.env.NODE_ENV = "development";
		mocks.getRequestHeaders.mockReturnValue(new Headers());
		mockAppUserQuery([
			{
				id: "admin-1",
				email: PREFERRED_DEV_OWNER_EMAIL,
				name: "Admin The Hard Blok",
				role: "owner",
				is_active: true,
			},
		]);
		mocks.signInEmail.mockResolvedValue({
			user: {
				id: "ba-admin",
				email: PREFERRED_DEV_OWNER_EMAIL,
				name: "Admin The Hard Blok",
			},
		});
		mocks.syncAppUserFromBetterAuthSession.mockResolvedValue({
			id: "admin-1",
			email: PREFERRED_DEV_OWNER_EMAIL,
			name: "Admin The Hard Blok",
			role: "owner",
		});

		await syncDevLoginAppUser({
			userId: "ba-admin",
			email: PREFERRED_DEV_OWNER_EMAIL,
			name: "Admin The Hard Blok",
			target: {
				mode: "existing_owner",
				email: PREFERRED_DEV_OWNER_EMAIL,
				name: "Admin The Hard Blok",
				password: "Admin1234!",
				appUserId: "admin-1",
				appRole: "owner",
			},
		});

		expect(mocks.ensureDefaultBusinessMembership).not.toHaveBeenCalled();
	});

	it("repeated dev login reuses admin and does not sign up dev-owner", async () => {
		process.env.NODE_ENV = "development";
		mocks.getRequestHeaders.mockReturnValue(new Headers());
		mockAppUserQuery([
			{
				id: "admin-1",
				email: PREFERRED_DEV_OWNER_EMAIL,
				name: "Admin The Hard Blok",
				role: "owner",
				is_active: true,
			},
		]);
		mocks.signInEmail.mockResolvedValue({
			user: {
				id: "ba-admin",
				email: PREFERRED_DEV_OWNER_EMAIL,
				name: "Admin The Hard Blok",
			},
		});
		mocks.syncAppUserFromBetterAuthSession.mockResolvedValue({
			id: "admin-1",
			email: PREFERRED_DEV_OWNER_EMAIL,
			name: "Admin The Hard Blok",
			role: "owner",
		});

		await signInDevOwner();
		await signInDevOwner();

		expect(mocks.signUpEmail).not.toHaveBeenCalled();
		expect(mocks.signInEmail).toHaveBeenCalledTimes(2);
		expect(
			mocks.signInEmail.mock.calls.every(
				([args]) => args.body.email === PREFERRED_DEV_OWNER_EMAIL,
			),
		).toBe(true);
	});

	it("signInDevOwner creates dev-owner only when no owner exists", async () => {
		process.env.NODE_ENV = "development";
		mocks.getRequestHeaders.mockReturnValue(new Headers());
		mockAppUserQuery([]);
		mocks.query.mockResolvedValueOnce({ rows: [] });
		mocks.signInEmail
			.mockRejectedValueOnce(
				new APIError("UNAUTHORIZED", {
					code: "INVALID_EMAIL_OR_PASSWORD",
					message: "invalid",
				}),
			)
			.mockResolvedValueOnce({
				user: {
					id: "ba-dev",
					email: DEV_OWNER_EMAIL,
					name: DEV_OWNER_NAME,
				},
			});
		mocks.signUpEmail.mockResolvedValue({});
		mocks.syncAppUserFromBetterAuthSession.mockResolvedValue({
			id: "user-dev",
			email: DEV_OWNER_EMAIL,
			name: DEV_OWNER_NAME,
			role: "cashier",
		});
		mockOwnerExists(false);
		mocks.query.mockResolvedValueOnce({ rows: [] });
		mocks.ensureDefaultBusinessMembership.mockResolvedValue({});

		const result = await signInDevOwner();

		expect(mocks.signUpEmail).toHaveBeenCalledWith({
			body: {
				email: DEV_OWNER_EMAIL,
				password: "dev-owner-local-only",
				name: DEV_OWNER_NAME,
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
