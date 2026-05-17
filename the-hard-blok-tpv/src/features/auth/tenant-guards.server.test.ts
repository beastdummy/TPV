import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getAppUserFn: vi.fn(),
	resolveDefaultBusinessContext: vi.fn(),
}));

vi.mock("./auth.rpc", () => ({
	getAppUserFn: mocks.getAppUserFn,
}));

vi.mock("../tenancy/context.server", () => ({
	resolveDefaultBusinessContext: mocks.resolveDefaultBusinessContext,
}));

import {
	createTenantAuthError,
	getCurrentTenantContext,
	hasBusinessRole,
	requireBusinessRole,
	requireTenantContext,
	TENANT_AUTH_ERRORS,
} from "./tenant-guards.server";

const sessionUser = {
	id: "user-1",
	email: "a@example.com",
	name: "Ada",
	role: "cashier" as const,
};

const businessContext = {
	userId: "user-1",
	businessId: "biz-1",
	businessSlug: "default",
	businessName: "The Hard Blok",
	membershipId: "mem-1",
	role: "manager" as const,
};

describe("getCurrentTenantContext", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("returns null when user is not authenticated", async () => {
		mocks.getAppUserFn.mockResolvedValue(null);

		await expect(getCurrentTenantContext()).resolves.toBeNull();
	});

	it("returns membership context when tenant resolves", async () => {
		mocks.getAppUserFn.mockResolvedValue(sessionUser);
		mocks.resolveDefaultBusinessContext.mockResolvedValue(businessContext);

		await expect(getCurrentTenantContext()).resolves.toEqual({
			user: sessionUser,
			business: businessContext,
			role: "manager",
			roleSource: "membership",
		});
	});

	it("falls back to legacy users.role when tenant is missing", async () => {
		mocks.getAppUserFn.mockResolvedValue(sessionUser);
		mocks.resolveDefaultBusinessContext.mockResolvedValue(null);

		await expect(getCurrentTenantContext()).resolves.toEqual({
			user: sessionUser,
			business: null,
			role: "cashier",
			roleSource: "legacy",
		});
	});
});

describe("requireTenantContext", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("throws UNAUTHORIZED when not logged in", async () => {
		mocks.getAppUserFn.mockResolvedValue(null);

		await expect(requireTenantContext()).rejects.toThrow(
			TENANT_AUTH_ERRORS.UNAUTHORIZED,
		);
	});

	it("throws TENANT_NOT_FOUND when business context is missing", async () => {
		mocks.getAppUserFn.mockResolvedValue(sessionUser);
		mocks.resolveDefaultBusinessContext.mockResolvedValue(null);

		await expect(requireTenantContext()).rejects.toThrow(
			TENANT_AUTH_ERRORS.TENANT_NOT_FOUND,
		);
	});

	it("returns tenant context when business resolves", async () => {
		mocks.getAppUserFn.mockResolvedValue(sessionUser);
		mocks.resolveDefaultBusinessContext.mockResolvedValue(businessContext);

		await expect(requireTenantContext()).resolves.toEqual({
			user: sessionUser,
			business: businessContext,
			role: "manager",
			roleSource: "membership",
		});
	});
});

describe("requireBusinessRole", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("allows access when membership role meets requirement", async () => {
		mocks.getAppUserFn.mockResolvedValue(sessionUser);
		mocks.resolveDefaultBusinessContext.mockResolvedValue({
			...businessContext,
			role: "owner",
		});

		const ctx = await requireBusinessRole(["manager"]);

		expect(ctx.roleSource).toBe("membership");
		expect(ctx.role).toBe("owner");
		expect(hasBusinessRole(ctx.role, ["manager"])).toBe(true);
	});

	it("denies access when role is insufficient", async () => {
		mocks.getAppUserFn.mockResolvedValue(sessionUser);
		mocks.resolveDefaultBusinessContext.mockResolvedValue({
			...businessContext,
			role: "cashier",
		});

		await expect(requireBusinessRole(["manager"])).rejects.toThrow(
			TENANT_AUTH_ERRORS.FORBIDDEN,
		);
	});

	it("uses legacy users.role when tenant context is unavailable", async () => {
		mocks.getAppUserFn.mockResolvedValue({
			...sessionUser,
			role: "admin",
		});
		mocks.resolveDefaultBusinessContext.mockResolvedValue(null);

		const ctx = await requireBusinessRole(["manager"]);

		expect(ctx.roleSource).toBe("legacy");
		expect(ctx.role).toBe("admin");
		expect(ctx.business).toBeNull();
	});

	it("denies legacy users.role when insufficient", async () => {
		mocks.getAppUserFn.mockResolvedValue(sessionUser);
		mocks.resolveDefaultBusinessContext.mockResolvedValue(null);

		await expect(requireBusinessRole(["manager"])).rejects.toThrow(
			TENANT_AUTH_ERRORS.FORBIDDEN,
		);
	});

	it("throws UNAUTHORIZED when not logged in", async () => {
		mocks.getAppUserFn.mockResolvedValue(null);

		await expect(requireBusinessRole(["cashier"])).rejects.toThrow(
			TENANT_AUTH_ERRORS.UNAUTHORIZED,
		);
	});

	it("uses legacy fallback when membership is suspended (no tenant resolved)", async () => {
		mocks.getAppUserFn.mockResolvedValue({
			...sessionUser,
			role: "manager",
		});
		mocks.resolveDefaultBusinessContext.mockResolvedValue(null);

		const ctx = await requireBusinessRole(["manager"]);

		expect(ctx.roleSource).toBe("legacy");
		expect(ctx.role).toBe("manager");
	});
});

describe("createTenantAuthError", () => {
	it("creates errors with stable codes", () => {
		expect(createTenantAuthError("FORBIDDEN").message).toBe("FORBIDDEN");
	});
});
