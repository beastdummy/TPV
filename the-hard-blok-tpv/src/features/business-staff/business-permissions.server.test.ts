import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getCurrentTenantContext: vi.fn(),
	getRolePermissionKeysForBusiness: vi.fn(),
}));

vi.mock("../auth/tenant-guards.server", () => ({
	getCurrentTenantContext: mocks.getCurrentTenantContext,
}));

vi.mock("./queries.server", () => ({
	getRolePermissionKeysForBusiness: mocks.getRolePermissionKeysForBusiness,
}));

import {
	hasBusinessPermission,
	requireBusinessPermission,
} from "./business-permissions.server";
import { BUSINESS_STAFF_ERRORS } from "./errors";

const businessContext = {
	userId: "user-1",
	businessId: "biz-a",
	businessSlug: "cafe-a",
	businessName: "Cafe A",
	membershipId: "mem-1",
	role: "cashier" as const,
};

describe("business-permissions.server", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("owner always has all permissions", async () => {
		mocks.getCurrentTenantContext.mockResolvedValue({
			user: { id: "u1", email: "o@cafe.com", name: "Owner", role: "owner" },
			business: businessContext,
			role: "owner",
			roleSource: "membership",
		});

		await expect(hasBusinessPermission("employees.delete")).resolves.toBe(true);
	});

	it("custom role uses business_role_permissions", async () => {
		mocks.getCurrentTenantContext.mockResolvedValue({
			user: { id: "u2", email: "e@cafe.com", name: "Emp", role: "cajero" },
			business: { ...businessContext, role: "cajero" },
			role: "cajero",
			roleSource: "membership",
		});
		mocks.getRolePermissionKeysForBusiness.mockResolvedValue(
			new Set(["employees.view"]),
		);

		await expect(hasBusinessPermission("employees.view")).resolves.toBe(true);
		await expect(hasBusinessPermission("employees.create")).resolves.toBe(
			false,
		);
	});

	it("legacy admin has employees permissions", async () => {
		mocks.getCurrentTenantContext.mockResolvedValue({
			user: { id: "u3", email: "a@cafe.com", name: "Admin", role: "admin" },
			business: { ...businessContext, role: "admin" },
			role: "admin",
			roleSource: "membership",
		});

		await expect(hasBusinessPermission("employees.create")).resolves.toBe(true);
	});

	it("cashier without custom permissions cannot access employees", async () => {
		mocks.getCurrentTenantContext.mockResolvedValue({
			user: { id: "u4", email: "c@cafe.com", name: "Cash", role: "cashier" },
			business: businessContext,
			role: "cashier",
			roleSource: "membership",
		});
		mocks.getRolePermissionKeysForBusiness.mockResolvedValue(new Set());

		await expect(hasBusinessPermission("employees.view")).resolves.toBe(false);
	});

	it("requireBusinessPermission throws FORBIDDEN", async () => {
		mocks.getCurrentTenantContext.mockResolvedValue({
			user: { id: "u4", email: "c@cafe.com", name: "Cash", role: "cashier" },
			business: businessContext,
			role: "cashier",
			roleSource: "membership",
		});
		mocks.getRolePermissionKeysForBusiness.mockResolvedValue(new Set());

		await expect(
			requireBusinessPermission("employees.view"),
		).rejects.toMatchObject({
			code: BUSINESS_STAFF_ERRORS.FORBIDDEN,
		});
	});
});
