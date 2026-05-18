import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getAppUserFn: vi.fn(),
	getSessionRedirectContextFn: vi.fn(),
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

vi.mock("@tanstack/react-router", () => ({
	redirect: mocks.redirect,
}));

import {
	requireDashboardPageForRoute,
	requireSetupPageForRoute,
} from "./route-guards";

const ownerSession = {
	authenticated: true,
	hasBusinessMembership: true,
	isPlatformOnly: false,
	setupCompleted: false,
	membershipRole: "owner" as const,
};

describe("setup and dashboard route guards", () => {
	beforeEach(() => {
		mocks.getAppUserFn.mockResolvedValue({
			id: "user-1",
			email: "owner@cafe.test",
			name: "Owner",
			role: "owner",
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("allows business owner with incomplete setup on /setup", async () => {
		mocks.getSessionRedirectContextFn.mockResolvedValue(ownerSession);

		await expect(requireSetupPageForRoute("/setup")).resolves.toBeUndefined();
	});

	it("redirects completed setup from /setup to /dashboard once", async () => {
		mocks.getSessionRedirectContextFn.mockResolvedValue({
			...ownerSession,
			setupCompleted: true,
		});

		await expect(requireSetupPageForRoute("/setup")).rejects.toMatchObject({
			message: "REDIRECT",
			opts: { to: "/dashboard" },
		});
	});

	it("redirects incomplete setup from /dashboard to /setup", async () => {
		mocks.getSessionRedirectContextFn.mockResolvedValue(ownerSession);

		await expect(
			requireDashboardPageForRoute("/dashboard"),
		).rejects.toMatchObject({
			message: "REDIRECT",
			opts: { to: "/setup" },
		});
	});

	it("allows completed setup on /dashboard", async () => {
		mocks.getSessionRedirectContextFn.mockResolvedValue({
			...ownerSession,
			setupCompleted: true,
		});

		await expect(
			requireDashboardPageForRoute("/dashboard"),
		).resolves.toBeUndefined();
	});

	it("redirects platform-only users away from /dashboard to /platform", async () => {
		mocks.getSessionRedirectContextFn.mockResolvedValue({
			authenticated: true,
			hasBusinessMembership: false,
			isPlatformOnly: true,
			setupCompleted: null,
			membershipRole: null,
		});

		await expect(
			requireDashboardPageForRoute("/dashboard"),
		).rejects.toMatchObject({
			message: "REDIRECT",
			opts: { to: "/platform" },
		});
	});

	it("redirects sessions without business away from /dashboard", async () => {
		mocks.getSessionRedirectContextFn.mockResolvedValue({
			authenticated: true,
			hasBusinessMembership: false,
			isPlatformOnly: false,
			setupCompleted: null,
			membershipRole: null,
		});

		await expect(
			requireDashboardPageForRoute("/dashboard"),
		).rejects.toMatchObject({
			message: "REDIRECT",
			opts: { to: "/register" },
		});
	});
});
