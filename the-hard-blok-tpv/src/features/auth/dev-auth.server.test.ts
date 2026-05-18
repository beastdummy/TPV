import { APIError } from "better-auth/api";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	syncAppUserFromBetterAuthSession: vi.fn(),
	upsertActivePlatformAdmin: vi.fn(),
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

vi.mock("../platform/platform-admin-queries.server", () => ({
	upsertActivePlatformAdmin: mocks.upsertActivePlatformAdmin,
}));

import {
	assertDevAuthEnabled,
	DEV_PLATFORM_LEGACY_USER_ROLE,
	DEV_PLATFORM_OWNER_EMAIL,
	DEV_PLATFORM_OWNER_NAME,
	DEV_PLATFORM_OWNER_ROLE,
	isDevAuthEnabled,
	signInDevOwner,
	syncDevPlatformOwnerAppUser,
} from "./dev-auth.server";

describe("dev auth (platform)", () => {
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

	it("syncDevPlatformOwnerAppUser upserts platform owner without business membership", async () => {
		mocks.syncAppUserFromBetterAuthSession.mockResolvedValue({
			id: "user-platform",
			email: DEV_PLATFORM_OWNER_EMAIL,
			name: DEV_PLATFORM_OWNER_NAME,
			role: "cashier",
		});
		mocks.query.mockResolvedValue({ rows: [] });
		mocks.upsertActivePlatformAdmin.mockResolvedValue({
			id: "pa-1",
			userId: "user-platform",
			role: DEV_PLATFORM_OWNER_ROLE,
			isActive: true,
		});

		const result = await syncDevPlatformOwnerAppUser({
			userId: "ba-platform",
			email: DEV_PLATFORM_OWNER_EMAIL,
			name: DEV_PLATFORM_OWNER_NAME,
		});

		expect(mocks.upsertActivePlatformAdmin).toHaveBeenCalledWith({
			userId: "user-platform",
			role: DEV_PLATFORM_OWNER_ROLE,
		});
		expect(mocks.query).toHaveBeenCalledWith(
			expect.stringContaining("UPDATE users"),
			["user-platform", DEV_PLATFORM_LEGACY_USER_ROLE, DEV_PLATFORM_OWNER_NAME],
		);
		expect(result.redirectTo).toBe("/platform");
		expect(result.role).toBe(DEV_PLATFORM_LEGACY_USER_ROLE);
	});

	it("signInDevOwner creates platform-owner and redirects to /platform", async () => {
		process.env.NODE_ENV = "development";
		mocks.getRequestHeaders.mockReturnValue(new Headers());
		mocks.signInEmail
			.mockRejectedValueOnce(
				new APIError("UNAUTHORIZED", {
					code: "INVALID_EMAIL_OR_PASSWORD",
					message: "invalid",
				}),
			)
			.mockResolvedValueOnce({
				user: {
					id: "ba-platform",
					email: DEV_PLATFORM_OWNER_EMAIL,
					name: DEV_PLATFORM_OWNER_NAME,
				},
			});
		mocks.signUpEmail.mockResolvedValue({});
		mocks.syncAppUserFromBetterAuthSession.mockResolvedValue({
			id: "user-platform",
			email: DEV_PLATFORM_OWNER_EMAIL,
			name: DEV_PLATFORM_OWNER_NAME,
			role: "cashier",
		});
		mocks.query.mockResolvedValue({ rows: [] });
		mocks.upsertActivePlatformAdmin.mockResolvedValue({
			id: "pa-1",
			userId: "user-platform",
			role: DEV_PLATFORM_OWNER_ROLE,
			isActive: true,
		});

		const result = await signInDevOwner();

		expect(mocks.signUpEmail).toHaveBeenCalledWith({
			body: {
				email: DEV_PLATFORM_OWNER_EMAIL,
				password: "dev-owner-local-only",
				name: DEV_PLATFORM_OWNER_NAME,
			},
			headers: expect.any(Headers),
		});
		expect(result.redirectTo).toBe("/platform");
		expect(mocks.upsertActivePlatformAdmin).toHaveBeenCalled();
	});

	it("signInDevOwner rejects in production", async () => {
		process.env.NODE_ENV = "production";

		await expect(signInDevOwner()).rejects.toThrow("DEV_AUTH_DISABLED");
	});
});
