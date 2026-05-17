import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	requireBusinessPermission: vi.fn(),
	requireStaffBusinessContext: vi.fn(),
	listEmployeesForBusiness: vi.fn(),
	findMembershipByEmailForBusiness: vi.fn(),
	insertUser: vi.fn(),
	insertBusinessMember: vi.fn(),
	getEmployeeMembershipForBusiness: vi.fn(),
	updateUserBasics: vi.fn(),
	updateBusinessMember: vi.fn(),
	listRolesForBusiness: vi.fn(),
}));

vi.mock("./business-permissions.server", () => ({
	requireBusinessPermission: mocks.requireBusinessPermission,
}));

vi.mock("./tenant-context.server", () => ({
	requireStaffBusinessContext: mocks.requireStaffBusinessContext,
}));

vi.mock("./queries.server", () => ({
	listEmployeesForBusiness: mocks.listEmployeesForBusiness,
	findMembershipByEmailForBusiness: mocks.findMembershipByEmailForBusiness,
	insertUser: mocks.insertUser,
	insertBusinessMember: mocks.insertBusinessMember,
	getEmployeeMembershipForBusiness: mocks.getEmployeeMembershipForBusiness,
	updateUserBasics: mocks.updateUserBasics,
	updateBusinessMember: mocks.updateBusinessMember,
	listRolesForBusiness: mocks.listRolesForBusiness,
}));

import {
	createEmployeeForBusiness,
	loadEmployeesForBusiness,
} from "./employees-access.server";
import { BUSINESS_STAFF_ERRORS } from "./errors";

const businessA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const businessB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("employees-access.server", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("owner can list employees for their business", async () => {
		mocks.requireBusinessPermission.mockResolvedValue({});
		mocks.requireStaffBusinessContext.mockResolvedValue({
			businessId: businessA,
		});
		mocks.listEmployeesForBusiness.mockResolvedValue([]);

		await expect(loadEmployeesForBusiness()).resolves.toEqual([]);
		expect(mocks.listEmployeesForBusiness).toHaveBeenCalledWith(businessA);
	});

	it("owner can create employee with employees.create", async () => {
		mocks.requireBusinessPermission.mockResolvedValue({});
		mocks.requireStaffBusinessContext.mockResolvedValue({
			businessId: businessA,
		});
		mocks.findMembershipByEmailForBusiness.mockResolvedValue(null);
		mocks.listRolesForBusiness.mockResolvedValue([
			{ slug: "cajero", name: "Cajero" },
		]);
		mocks.insertUser.mockResolvedValue("user-new");
		mocks.insertBusinessMember.mockResolvedValue("mem-new");

		const result = await createEmployeeForBusiness({
			name: "Ana",
			email: "ana@cafe.com",
			role_slug: "cajero",
			status: "active",
		});

		expect(result.membership_id).toBe("mem-new");
		expect(mocks.insertBusinessMember).toHaveBeenCalledWith(
			expect.objectContaining({ businessId: businessA }),
		);
	});

	it("scopes listing to current business only", async () => {
		mocks.requireBusinessPermission.mockResolvedValue({});
		mocks.requireStaffBusinessContext.mockResolvedValue({
			businessId: businessB,
		});
		mocks.listEmployeesForBusiness.mockResolvedValue([]);

		await loadEmployeesForBusiness();
		expect(mocks.listEmployeesForBusiness).toHaveBeenCalledWith(businessB);
		expect(mocks.listEmployeesForBusiness).not.toHaveBeenCalledWith(businessA);
	});

	it("rejects duplicate email in same business", async () => {
		mocks.requireBusinessPermission.mockResolvedValue({});
		mocks.requireStaffBusinessContext.mockResolvedValue({
			businessId: businessA,
		});
		mocks.findMembershipByEmailForBusiness.mockResolvedValue({
			membership_id: "existing",
		});

		await expect(
			createEmployeeForBusiness({
				name: "Ana",
				email: "ana@cafe.com",
				role_slug: "cashier",
				status: "active",
			}),
		).rejects.toMatchObject({
			code: BUSINESS_STAFF_ERRORS.DUPLICATE_EMAIL,
		});
	});
});
