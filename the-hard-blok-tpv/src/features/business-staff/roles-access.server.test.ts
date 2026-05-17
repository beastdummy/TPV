import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	requireBusinessPermission: vi.fn(),
	requireStaffBusinessContext: vi.fn(),
	listRolesForBusiness: vi.fn(),
	insertBusinessRole: vi.fn(),
	getRoleForBusiness: vi.fn(),
	findRoleByNameForBusiness: vi.fn(),
	deleteBusinessRole: vi.fn(),
}));

vi.mock("./business-permissions.server", () => ({
	requireBusinessPermission: mocks.requireBusinessPermission,
}));

vi.mock("./tenant-context.server", () => ({
	requireStaffBusinessContext: mocks.requireStaffBusinessContext,
}));

vi.mock("./queries.server", () => ({
	listRolesForBusiness: mocks.listRolesForBusiness,
	insertBusinessRole: mocks.insertBusinessRole,
	getRoleForBusiness: mocks.getRoleForBusiness,
	findRoleByNameForBusiness: mocks.findRoleByNameForBusiness,
	deleteBusinessRole: mocks.deleteBusinessRole,
}));

import { BUSINESS_STAFF_ERRORS } from "./errors";
import {
	createRoleForBusiness,
	deleteRoleForBusiness,
	loadRolesForBusiness,
} from "./roles-access.server";

const businessA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const businessB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

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

	it("lists roles only for current business", async () => {
		mocks.requireBusinessPermission.mockResolvedValue({});
		mocks.requireStaffBusinessContext.mockResolvedValue({
			businessId: businessB,
		});
		mocks.listRolesForBusiness.mockResolvedValue([]);

		await loadRolesForBusiness();
		expect(mocks.listRolesForBusiness).toHaveBeenCalledWith(businessB);
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
		mocks.getRoleForBusiness.mockResolvedValue({
			id: "role-owner",
			business_id: businessA,
			slug: "owner",
			name: "Owner",
			description: "",
			is_system: true,
			member_count: 0,
		});

		await expect(deleteRoleForBusiness("role-owner")).rejects.toMatchObject({
			code: BUSINESS_STAFF_ERRORS.OWNER_PROTECTED,
		});
	});
});
