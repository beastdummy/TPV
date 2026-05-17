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
	requireAnyBusinessPermission,
	requireBusinessPermission,
} from "./business-permissions.server";
import { BUSINESS_STAFF_ERRORS } from "./errors";
import { ALL_BUSINESS_PERMISSION_KEYS } from "./permissions";

const businessContext = {
	userId: "user-1",
	businessId: "biz-a",
	businessSlug: "cafe-a",
	businessName: "Cafe A",
	membershipId: "mem-1",
	role: "cashier" as const,
};

const ownerContext = {
	user: { id: "u1", email: "o@cafe.com", name: "Owner", role: "owner" },
	business: { ...businessContext, role: "owner" },
	role: "owner" as const,
	roleSource: "membership" as const,
};

describe("business-permissions.server", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("owner has every catalog permission including audit", async () => {
		mocks.getCurrentTenantContext.mockResolvedValue(ownerContext);

		for (const key of ALL_BUSINESS_PERMISSION_KEYS) {
			await expect(hasBusinessPermission(key)).resolves.toBe(true);
		}
	});

	it("owner does not query business_role_permissions", async () => {
		mocks.getCurrentTenantContext.mockResolvedValue(ownerContext);

		await hasBusinessPermission("employees.view");
		await hasBusinessPermission("audit.manage");

		expect(mocks.getRolePermissionKeysForBusiness).not.toHaveBeenCalled();
	});

	it("owner can access employees, roles and audit via requireBusinessPermission", async () => {
		mocks.getCurrentTenantContext.mockResolvedValue(ownerContext);

		await expect(
			requireBusinessPermission("employees.view"),
		).resolves.toMatchObject({ role: "owner" });
		await expect(
			requireBusinessPermission("roles.manage"),
		).resolves.toMatchObject({ role: "owner" });
		await expect(
			requireBusinessPermission("audit.view"),
		).resolves.toMatchObject({ role: "owner" });
	});

	it("requireAnyBusinessPermission allows owner without checking keys", async () => {
		mocks.getCurrentTenantContext.mockResolvedValue(ownerContext);

		await expect(
			requireAnyBusinessPermission(["audit.manage", "settings.delete"]),
		).resolves.toMatchObject({ role: "owner" });
		expect(mocks.getRolePermissionKeysForBusiness).not.toHaveBeenCalled();
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

	it("requireBusinessPermission throws FORBIDDEN for cashier", async () => {
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
