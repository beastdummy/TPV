import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	findMembershipByEmailForBusiness: vi.fn(),
	listRolesForBusiness: vi.fn(),
	insertUser: vi.fn(),
	insertBusinessMember: vi.fn(),
	findRoleBySlugForBusiness: vi.fn(),
	insertBusinessRole: vi.fn(),
	replaceRolePermissions: vi.fn(),
	markStaffStepHandledForBusiness: vi.fn(),
	listEmployeesForBusiness: vi.fn(),
}));

vi.mock("../business-staff/queries.server", () => ({
	findMembershipByEmailForBusiness: mocks.findMembershipByEmailForBusiness,
	listRolesForBusiness: mocks.listRolesForBusiness,
	insertUser: mocks.insertUser,
	insertBusinessMember: mocks.insertBusinessMember,
	findRoleBySlugForBusiness: mocks.findRoleBySlugForBusiness,
	insertBusinessRole: mocks.insertBusinessRole,
	replaceRolePermissions: mocks.replaceRolePermissions,
	listEmployeesForBusiness: mocks.listEmployeesForBusiness,
}));

vi.mock("../auth/password.server", () => ({
	hashPassword: vi.fn((value: string) => `hash:${value}`),
}));

vi.mock("./setup-queries.server", () => ({
	markStaffStepHandledForBusiness: mocks.markStaffStepHandledForBusiness,
}));

import {
	setupCreateEmployee,
	setupCreateQuickRole,
	setupSkipStaffStep,
} from "./setup-staff-wizard.server";

describe("setup staff wizard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.findMembershipByEmailForBusiness.mockResolvedValue(null);
		mocks.listRolesForBusiness.mockResolvedValue([
			{
				id: "role-1",
				slug: "cajero",
				name: "Cajero",
				description: "",
				is_system: false,
				member_count: 0,
				business_id: "biz-1",
			},
		]);
		mocks.insertUser.mockResolvedValue("user-1");
		mocks.insertBusinessMember.mockResolvedValue("mem-1");
		mocks.findRoleBySlugForBusiness.mockResolvedValue(null);
		mocks.insertBusinessRole.mockResolvedValue("role-new");
	});

	it("allows skipping employees without creating staff", async () => {
		await setupSkipStaffStep("biz-1");
		expect(mocks.markStaffStepHandledForBusiness).toHaveBeenCalledWith("biz-1");
	});

	it("creates an employee with PIN during setup", async () => {
		const result = await setupCreateEmployee("biz-1", {
			name: "Ana",
			email: "ana@local.test",
			role_slug: "cajero",
			pin: "1234",
		});

		expect(result.membership_id).toBe("mem-1");
		expect(mocks.insertBusinessMember).toHaveBeenCalledWith(
			expect.objectContaining({
				roleSlug: "cajero",
				posPinHash: "hash:1234",
			}),
		);
	});

	it("creates quick role presets when none exist", async () => {
		const result = await setupCreateQuickRole("biz-1", "cajero");

		expect(result.created).toBe(true);
		expect(mocks.insertBusinessRole).toHaveBeenCalled();
		expect(mocks.replaceRolePermissions).toHaveBeenCalled();
	});

	it("does not insert preset when slug already exists", async () => {
		mocks.findRoleBySlugForBusiness.mockResolvedValue({
			id: "role-cajero",
			slug: "cajero",
		});

		const result = await setupCreateQuickRole("biz-1", "cajero");

		expect(result.created).toBe(false);
		expect(result.role_id).toBe("role-cajero");
		expect(mocks.insertBusinessRole).not.toHaveBeenCalled();
		expect(mocks.replaceRolePermissions).not.toHaveBeenCalled();
	});
});
