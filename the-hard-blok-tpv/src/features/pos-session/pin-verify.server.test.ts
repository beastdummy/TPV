import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	listActiveMembersWithPinForBusiness: vi.fn(),
	verifyBusinessMemberPin: vi.fn(),
	hasPermissionForBusinessRole: vi.fn(),
	getEmployeeMembershipForBusiness: vi.fn(),
}));

vi.mock("../business-staff/queries.server", () => ({
	listActiveMembersWithPinForBusiness:
		mocks.listActiveMembersWithPinForBusiness,
	getEmployeeMembershipForBusiness: mocks.getEmployeeMembershipForBusiness,
}));

vi.mock("../business-staff/pos-pin.server", () => ({
	verifyBusinessMemberPin: mocks.verifyBusinessMemberPin,
}));

vi.mock("../business-staff/permission-for-role.server", () => ({
	hasPermissionForBusinessRole: mocks.hasPermissionForBusinessRole,
}));

vi.mock("./rate-limit.server", () => ({
	assertPosPinRateLimitAllowed: vi.fn(),
	clearPosPinRateLimit: vi.fn(),
	recordPosPinFailure: vi.fn(),
}));

import { SALES_TX_ERROR_CODES } from "../sales/transaction/errors";
import { verifyPosPinForTerminal } from "./pin-verify.server";

const businessId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("pin-verify.server", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("rejects suspended member via active-only list", async () => {
		mocks.listActiveMembersWithPinForBusiness.mockResolvedValue([]);
		mocks.verifyBusinessMemberPin.mockResolvedValue(false);

		await expect(
			verifyPosPinForTerminal({
				businessId,
				terminalId: "tpv-1",
				pin: "1234",
			}),
		).rejects.toMatchObject({
			code: SALES_TX_ERROR_CODES.POS_PIN_INVALID,
		});
	});

	it("rejects role without sales.view", async () => {
		mocks.listActiveMembersWithPinForBusiness.mockResolvedValue([
			{
				membership_id: "mem-1",
				user_id: "user-1",
				role_slug: "custom-no-sales",
				name: "Emp",
				email: "e@cafe.com",
				pos_pin_hash: "hash",
			},
		]);
		mocks.verifyBusinessMemberPin.mockResolvedValue(true);
		mocks.hasPermissionForBusinessRole.mockResolvedValue(false);

		await expect(
			verifyPosPinForTerminal({
				businessId,
				terminalId: "tpv-1",
				pin: "1234",
			}),
		).rejects.toMatchObject({
			code: SALES_TX_ERROR_CODES.POS_PIN_INVALID,
		});
	});

	it("owner with valid pin can unlock", async () => {
		mocks.listActiveMembersWithPinForBusiness.mockResolvedValue([
			{
				membership_id: "mem-owner",
				user_id: "user-owner",
				role_slug: "owner",
				name: "Owner",
				email: "owner@cafe.com",
				pos_pin_hash: "hash",
			},
		]);
		mocks.verifyBusinessMemberPin.mockResolvedValue(true);
		mocks.hasPermissionForBusinessRole.mockResolvedValue(true);

		const result = await verifyPosPinForTerminal({
			businessId,
			terminalId: "tpv-1",
			pin: "1234",
		});

		expect(result.role_slug).toBe("owner");
	});
});
