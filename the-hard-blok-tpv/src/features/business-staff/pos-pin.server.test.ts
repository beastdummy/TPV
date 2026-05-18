import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getBusinessMemberPinHash: vi.fn(),
	verifyPassword: vi.fn(),
}));

vi.mock("./queries.server", () => ({
	getBusinessMemberPinHash: mocks.getBusinessMemberPinHash,
}));

vi.mock("../auth/password.server", () => ({
	verifyPassword: mocks.verifyPassword,
}));

import { verifyBusinessMemberPin } from "./pos-pin.server";

const businessId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const memberId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("verifyBusinessMemberPin", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("returns true when pin matches hash", async () => {
		mocks.getBusinessMemberPinHash.mockResolvedValue("scrypt:hash");
		mocks.verifyPassword.mockReturnValue(true);

		await expect(
			verifyBusinessMemberPin(businessId, memberId, "1234"),
		).resolves.toBe(true);
	});

	it("returns false for wrong pin", async () => {
		mocks.getBusinessMemberPinHash.mockResolvedValue("scrypt:hash");
		mocks.verifyPassword.mockReturnValue(false);

		await expect(
			verifyBusinessMemberPin(businessId, memberId, "1234"),
		).resolves.toBe(false);
	});

	it("returns false when member has no pin", async () => {
		mocks.getBusinessMemberPinHash.mockResolvedValue(null);

		await expect(
			verifyBusinessMemberPin(businessId, memberId, "1234"),
		).resolves.toBe(false);
	});

	it("rejects invalid pin format", async () => {
		await expect(
			verifyBusinessMemberPin(businessId, memberId, "12"),
		).resolves.toBe(false);
		expect(mocks.getBusinessMemberPinHash).not.toHaveBeenCalled();
	});
});
