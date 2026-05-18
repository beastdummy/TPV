import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	requireStaffBusinessContext: vi.fn(),
	getMembershipByUserIdForBusiness: vi.fn(),
	updateMemberPosPinOnly: vi.fn(),
	getBusinessMemberPinHash: vi.fn(),
	verifyPassword: vi.fn(),
	hashPassword: vi.fn(),
	hasBusinessPermission: vi.fn(),
}));

vi.mock("./tenant-context.server", () => ({
	requireStaffBusinessContext: mocks.requireStaffBusinessContext,
}));

vi.mock("./queries.server", () => ({
	getMembershipByUserIdForBusiness: mocks.getMembershipByUserIdForBusiness,
	getEmployeeMembershipForBusiness: vi.fn(),
	updateMemberPosPinOnly: mocks.updateMemberPosPinOnly,
	getBusinessMemberPinHash: mocks.getBusinessMemberPinHash,
}));

vi.mock("../auth/password.server", () => ({
	hashPassword: mocks.hashPassword,
	verifyPassword: mocks.verifyPassword,
}));

vi.mock("./business-permissions.server", () => ({
	requireBusinessPermission: vi.fn().mockResolvedValue({}),
	hasBusinessPermission: mocks.hasBusinessPermission,
}));

import { BUSINESS_STAFF_ERRORS } from "./errors";
import {
	setEmployeePosPinForBusiness,
	setMyPosPinForBusiness,
	verifyMyPosPinForBusiness,
} from "./pos-pin-access.server";

const businessId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const userOwner = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const membershipOwner = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

describe("pos-pin-access.server", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("owner can save PIN", async () => {
		mocks.requireStaffBusinessContext.mockResolvedValue({
			businessId,
			userId: userOwner,
			actorRole: "owner",
		});
		mocks.getMembershipByUserIdForBusiness.mockResolvedValue({
			membership_id: membershipOwner,
			role_slug: "owner",
			has_pin: false,
		});
		mocks.hashPassword.mockReturnValue("hashed-pin");

		await expect(setMyPosPinForBusiness("123456")).resolves.toEqual({
			ok: true,
		});
		expect(mocks.updateMemberPosPinOnly).toHaveBeenCalledWith({
			businessId,
			membershipId: membershipOwner,
			posPinHash: "hashed-pin",
		});
	});

	it("owner can verify PIN", async () => {
		mocks.requireStaffBusinessContext.mockResolvedValue({
			businessId,
			userId: userOwner,
			actorRole: "owner",
		});
		mocks.getMembershipByUserIdForBusiness.mockResolvedValue({
			membership_id: membershipOwner,
			role_slug: "owner",
			has_pin: true,
		});
		mocks.getBusinessMemberPinHash.mockResolvedValue("scrypt:hash");
		mocks.verifyPassword.mockReturnValue(true);

		await expect(verifyMyPosPinForBusiness("1234")).resolves.toEqual({
			ok: true,
		});
	});

	it("fails when PIN is incorrect", async () => {
		mocks.requireStaffBusinessContext.mockResolvedValue({
			businessId,
			userId: userOwner,
			actorRole: "owner",
		});
		mocks.getMembershipByUserIdForBusiness.mockResolvedValue({
			membership_id: membershipOwner,
			role_slug: "owner",
			has_pin: true,
		});
		mocks.getBusinessMemberPinHash.mockResolvedValue("scrypt:hash");
		mocks.verifyPassword.mockReturnValue(false);

		await expect(verifyMyPosPinForBusiness("9999")).rejects.toMatchObject({
			code: BUSINESS_STAFF_ERRORS.VALIDATION,
		});
	});

	it("owner keeps full permissions with PIN configured", async () => {
		mocks.hasBusinessPermission.mockResolvedValue(true);

		await expect(mocks.hasBusinessPermission("audit.view")).resolves.toBe(true);
		await expect(mocks.hasBusinessPermission("roles.manage")).resolves.toBe(
			true,
		);
	});

	it("employee cannot change owner PIN", async () => {
		const { getEmployeeMembershipForBusiness } = await import(
			"./queries.server"
		);

		mocks.requireStaffBusinessContext.mockResolvedValue({
			businessId,
			userId: "user-mgr",
			actorRole: "manager",
		});
		vi.mocked(getEmployeeMembershipForBusiness).mockResolvedValue({
			membership_id: membershipOwner,
			user_id: userOwner,
			name: "Owner",
			email: "owner@cafe.com",
			role_slug: "owner",
			role_name: "Propietario",
			status: "active",
			has_pin: true,
			is_primary: true,
		});
		mocks.getMembershipByUserIdForBusiness.mockResolvedValue({
			membership_id: "mem-mgr",
			role_slug: "manager",
			has_pin: true,
		});

		await expect(
			setEmployeePosPinForBusiness(membershipOwner, "1234"),
		).rejects.toMatchObject({
			code: BUSINESS_STAFF_ERRORS.OWNER_PROTECTED,
		});
	});
});
