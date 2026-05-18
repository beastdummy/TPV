import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getAppUserFn: vi.fn(),
	getSessionRedirectContextFn: vi.fn(),
	ensureCatalogManagementTenantFn: vi.fn(),
	requireBusinessRole: vi.fn(),
	redirect: vi.fn((opts: unknown) => {
		const err = new Error("REDIRECT");
		(err as Error & { opts: unknown }).opts = opts;
		throw err;
	}),
}));

vi.mock("./auth.rpc", () => ({
	getAppUserFn: mocks.getAppUserFn,
	getSessionRedirectContextFn: mocks.getSessionRedirectContextFn,
	ensureCatalogManagementTenantFn: mocks.ensureCatalogManagementTenantFn,
}));

vi.mock("./tenant-guards.server", () => ({
	requireBusinessRole: mocks.requireBusinessRole,
	TENANT_AUTH_ERRORS: {
		UNAUTHORIZED: "UNAUTHORIZED",
		FORBIDDEN: "FORBIDDEN",
		TENANT_NOT_FOUND: "TENANT_NOT_FOUND",
	},
}));

vi.mock("@tanstack/react-router", () => ({
	redirect: mocks.redirect,
}));

import { requireCatalogManagementTenantForRoute } from "./route-guards";
import {
	requireBusinessRoleForRoute,
	requireCatalogManagementForRoute,
} from "./route-guards.server";

const sessionUser = {
	id: "user-1",
	email: "a@example.com",
	name: "Ada",
	role: "manager" as const,
};

function mockIncompleteBusinessSession(
	membershipRole: "owner" | "manager" | "cashier" = "cashier",
) {
	mocks.getSessionRedirectContextFn.mockResolvedValue({
		authenticated: true,
		hasBusinessMembership: true,
		isPlatformOnly: false,
		setupCompleted: false,
		membershipRole,
	});
}

describe("requireCatalogManagementTenantForRoute", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("applies legacy guard then tenant RPC", async () => {
		mocks.getSessionRedirectContextFn.mockResolvedValue({
			authenticated: true,
			hasBusinessMembership: true,
			isPlatformOnly: false,
			setupCompleted: true,
			membershipRole: "admin",
		});
		mocks.getAppUserFn.mockResolvedValue({
			...sessionUser,
			role: "admin",
		});
		mocks.ensureCatalogManagementTenantFn.mockResolvedValue({
			role: "admin",
			roleSource: "membership",
		});

		await expect(
			requireCatalogManagementTenantForRoute("/admin/products"),
		).resolves.toMatchObject({ role: "admin", roleSource: "membership" });
	});

	it("redirects when legacy users.role is cashier", async () => {
		mockIncompleteBusinessSession("cashier");
		mocks.getAppUserFn.mockResolvedValue({
			...sessionUser,
			role: "cashier",
		});

		await expect(
			requireCatalogManagementTenantForRoute("/admin/products"),
		).rejects.toMatchObject({
			message: "REDIRECT",
			opts: { to: "/setup" },
		});

		expect(mocks.ensureCatalogManagementTenantFn).not.toHaveBeenCalled();
	});

	it("redirects to setup when tenant RPC returns FORBIDDEN", async () => {
		mockIncompleteBusinessSession("manager");
		mocks.getAppUserFn.mockResolvedValue(sessionUser);
		mocks.ensureCatalogManagementTenantFn.mockRejectedValue(
			new Error("FORBIDDEN"),
		);

		await expect(
			requireCatalogManagementTenantForRoute("/admin/products"),
		).rejects.toMatchObject({
			message: "REDIRECT",
			opts: { to: "/setup" },
		});
	});

	it("allows legacy fallback when tenant RPC resolves with roleSource legacy", async () => {
		mocks.getSessionRedirectContextFn.mockResolvedValue({
			authenticated: true,
			hasBusinessMembership: true,
			isPlatformOnly: false,
			setupCompleted: true,
			membershipRole: "manager",
		});
		mocks.getAppUserFn.mockResolvedValue({
			...sessionUser,
			role: "manager",
		});
		mocks.ensureCatalogManagementTenantFn.mockResolvedValue({
			role: "manager",
			roleSource: "legacy",
			business: null,
		});

		await expect(
			requireCatalogManagementTenantForRoute("/admin/products"),
		).resolves.toMatchObject({ roleSource: "legacy" });
	});
});

describe("requireBusinessRoleForRoute (server)", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("returns tenant context when role is allowed", async () => {
		mocks.getSessionRedirectContextFn.mockResolvedValue({
			authenticated: true,
			hasBusinessMembership: true,
			isPlatformOnly: false,
			setupCompleted: true,
			membershipRole: "manager",
		});
		mocks.getAppUserFn.mockResolvedValue(sessionUser);
		mocks.requireBusinessRole.mockResolvedValue({
			user: sessionUser,
			role: "manager",
			roleSource: "membership",
		});

		await expect(
			requireBusinessRoleForRoute(["manager"], "/admin/products"),
		).resolves.toMatchObject({ role: "manager", roleSource: "membership" });
	});

	it("redirects to login when unauthorized", async () => {
		mocks.getAppUserFn.mockResolvedValue(null);

		await expect(
			requireBusinessRoleForRoute(["manager"], "/admin/products"),
		).rejects.toMatchObject({
			message: "REDIRECT",
			opts: { to: "/login", search: { redirect: "/admin/products" } },
		});
	});

	it("redirects to setup when forbidden and setup is incomplete", async () => {
		mockIncompleteBusinessSession("manager");
		mocks.getAppUserFn.mockResolvedValue(sessionUser);
		mocks.requireBusinessRole.mockRejectedValue(new Error("FORBIDDEN"));

		await expect(
			requireBusinessRoleForRoute(["manager"], "/admin/products"),
		).rejects.toMatchObject({
			message: "REDIRECT",
			opts: { to: "/setup" },
		});
	});
});

describe("requireCatalogManagementForRoute (server)", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("chains legacy and tenant guards", async () => {
		mocks.getSessionRedirectContextFn.mockResolvedValue({
			authenticated: true,
			hasBusinessMembership: true,
			isPlatformOnly: false,
			setupCompleted: true,
			membershipRole: "manager",
		});
		mocks.getAppUserFn.mockResolvedValue({
			...sessionUser,
			role: "manager",
		});
		mocks.requireBusinessRole.mockResolvedValue({
			role: "manager",
			roleSource: "membership",
		});

		await expect(
			requireCatalogManagementForRoute("/admin/products"),
		).resolves.toMatchObject({ role: "manager" });

		expect(mocks.requireBusinessRole).toHaveBeenCalledWith([
			"owner",
			"admin",
			"manager",
		]);
	});
});
