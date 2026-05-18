import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	requireBusinessPermission: vi.fn(),
	requireStaffBusinessContext: vi.fn(),
	listRolesForBusiness: vi.fn(),
	countActiveOwnersForBusiness: vi.fn(),
	insertBusinessRole: vi.fn(),
	getRoleForBusiness: vi.fn(),
	findRoleByNameForBusiness: vi.fn(),
	deleteBusinessRole: vi.fn(),
	listPermissionKeysForRole: vi.fn(),
	replaceRolePermissions: vi.fn(),
	updateBusinessRole: vi.fn(),
}));

vi.mock("./business-permissions.server", () => ({
	requireBusinessPermission: mocks.requireBusinessPermission,
}));

vi.mock("./tenant-context.server", () => ({
	requireStaffBusinessContext: mocks.requireStaffBusinessContext,
}));

vi.mock("./queries.server", () => ({
	listRolesForBusiness: mocks.listRolesForBusiness,
	countActiveOwnersForBusiness: mocks.countActiveOwnersForBusiness,
	insertBusinessRole: mocks.insertBusinessRole,
	getRoleForBusiness: mocks.getRoleForBusiness,
	findRoleByNameForBusiness: mocks.findRoleByNameForBusiness,
	deleteBusinessRole: mocks.deleteBusinessRole,
	listPermissionKeysForRole: mocks.listPermissionKeysForRole,
	replaceRolePermissions: mocks.replaceRolePermissions,
	updateBusinessRole: mocks.updateBusinessRole,
}));

import { BUSINESS_STAFF_ERRORS } from "./errors";
import {
	createRoleForBusiness,
	deleteRoleForBusiness,
	loadRolePermissionsForBusiness,
	loadRolesForBusiness,
	saveRolePermissionsForBusiness,
	updateRoleForBusiness,
} from "./roles-access.server";

const businessA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const businessB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const ownerRoleRow = {
	id: "role-owner",
	business_id: businessA,
	slug: "owner",
	name: "Owner",
	description: "",
	is_system: true,
	member_count: 1,
};

describe("roles-access.server", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("owner can create role", async () => {
		mocks.requireBusinessPermission.mockResolvedValue({});
		mocks.requireStaffBusinessContext.mockResolvedValue({
			businessId: businessA,
		});
		mocks.findRoleByNameForBusiness.mockResolvedValue(null);
		mocks.insertBusinessRole.mockResolvedValue("role-1");

		const result = await createRoleForBusiness({
			name: "Cajero",
			description: "",
		});

		expect(result.role_id).toBe("role-1");
	});

	it("lists roles and system owner metadata for current business", async () => {
		mocks.requireBusinessPermission.mockResolvedValue({});
		mocks.requireStaffBusinessContext.mockResolvedValue({
			businessId: businessB,
		});
		mocks.listRolesForBusiness.mockResolvedValue([]);
		mocks.countActiveOwnersForBusiness.mockResolvedValue(2);

		const result = await loadRolesForBusiness();

		expect(mocks.listRolesForBusiness).toHaveBeenCalledWith(businessB);
		expect(result.owner).toMatchObject({
			slug: "owner",
			is_system: true,
			member_count: 2,
		});
	});

	it("cannot delete role assigned to employees", async () => {
		mocks.requireBusinessPermission.mockResolvedValue({});
		mocks.requireStaffBusinessContext.mockResolvedValue({
			businessId: businessA,
		});
		mocks.getRoleForBusiness.mockResolvedValue({
			id: "role-1",
			business_id: businessA,
			slug: "cajero",
			name: "Cajero",
			description: "",
			is_system: false,
			member_count: 2,
		});

		await expect(deleteRoleForBusiness("role-1")).rejects.toMatchObject({
			code: BUSINESS_STAFF_ERRORS.ROLE_IN_USE,
		});
	});

	it("cannot delete owner role", async () => {
		mocks.requireBusinessPermission.mockResolvedValue({});
		mocks.requireStaffBusinessContext.mockResolvedValue({
			businessId: businessA,
		});
		mocks.getRoleForBusiness.mockResolvedValue(ownerRoleRow);

		await expect(deleteRoleForBusiness("role-owner")).rejects.toMatchObject({
			code: BUSINESS_STAFF_ERRORS.OWNER_PROTECTED,
		});
	});

	it("cannot load permissions for owner role", async () => {
		mocks.requireBusinessPermission.mockResolvedValue({});
		mocks.requireStaffBusinessContext.mockResolvedValue({
			businessId: businessA,
		});
		mocks.getRoleForBusiness.mockResolvedValue(ownerRoleRow);

		await expect(
			loadRolePermissionsForBusiness("role-owner"),
		).rejects.toMatchObject({
			code: BUSINESS_STAFF_ERRORS.OWNER_PROTECTED,
		});
		expect(mocks.listPermissionKeysForRole).not.toHaveBeenCalled();
	});

	it("cannot save permissions for owner role", async () => {
		mocks.requireBusinessPermission.mockResolvedValue({});
		mocks.requireStaffBusinessContext.mockResolvedValue({
			businessId: businessA,
		});
		mocks.getRoleForBusiness.mockResolvedValue(ownerRoleRow);

		await expect(
			saveRolePermissionsForBusiness({
				role_id: "role-owner",
				permission_keys: ["audit.view"],
			}),
		).rejects.toMatchObject({
			code: BUSINESS_STAFF_ERRORS.OWNER_PROTECTED,
		});
		expect(mocks.replaceRolePermissions).not.toHaveBeenCalled();
	});

	it("cannot update owner role", async () => {
		mocks.requireBusinessPermission.mockResolvedValue({});
		mocks.requireStaffBusinessContext.mockResolvedValue({
			businessId: businessA,
		});
		mocks.getRoleForBusiness.mockResolvedValue(ownerRoleRow);

		await expect(
			updateRoleForBusiness({
				role_id: "role-owner",
				name: "Otro",
				description: "",
			}),
		).rejects.toMatchObject({
			code: BUSINESS_STAFF_ERRORS.OWNER_PROTECTED,
		});
		expect(mocks.updateBusinessRole).not.toHaveBeenCalled();
	});
});
