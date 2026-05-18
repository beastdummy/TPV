import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getAppUserFn: vi.fn(),
	getSessionRedirectContextFn: vi.fn(),
	ensurePlatformAdminFn: vi.fn(),
	redirect: vi.fn((opts: unknown) => {
		const err = new Error("REDIRECT");
		(err as Error & { opts: unknown }).opts = opts;
		throw err;
	}),
}));

vi.mock("./auth.rpc", () => ({
	getAppUserFn: mocks.getAppUserFn,
	getSessionRedirectContextFn: mocks.getSessionRedirectContextFn,
}));

vi.mock("../platform/platform.rpc", () => ({
	ensurePlatformAdminFn: mocks.ensurePlatformAdminFn,
}));

vi.mock("@tanstack/react-router", () => ({
	redirect: mocks.redirect,
}));

import { requirePlatformAdminForRoute } from "./route-guards";

describe("requirePlatformAdminForRoute", () => {
	afterEach(() => {
		vi.resetAllMocks();
	});

	it("allows platform admin session", async () => {
		mocks.getAppUserFn.mockResolvedValue({
			id: "user-1",
			email: "ops@thehardblok.com",
			name: "Ops",
			role: "owner",
		});
		mocks.ensurePlatformAdminFn.mockResolvedValue({
			user: { id: "user-1", email: "ops@thehardblok.com", name: "Ops" },
			platformAdmin: {
				id: "pa-1",
				userId: "user-1",
				role: "admin",
				isActive: true,
			},
		});

		await expect(
			requirePlatformAdminForRoute("/platform"),
		).resolves.toMatchObject({
			platformAdmin: { role: "admin" },
		});
	});

	it("redirects business owner with incomplete setup to /setup", async () => {
		mocks.getAppUserFn.mockResolvedValue({
			id: "biz-owner",
			email: "owner@cafe.com",
			name: "Owner",
			role: "owner",
		});
		mocks.getSessionRedirectContextFn.mockResolvedValue({
			authenticated: true,
			hasBusinessMembership: true,
			isPlatformOnly: false,
			setupCompleted: false,
			membershipRole: "owner",
		});
		mocks.ensurePlatformAdminFn.mockRejectedValue(new Error("FORBIDDEN"));

		await expect(
			requirePlatformAdminForRoute("/platform"),
		).rejects.toMatchObject({
			message: "REDIRECT",
			opts: { to: "/setup" },
		});
	});
});
