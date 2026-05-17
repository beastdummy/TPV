import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getAppUserFn: vi.fn(),
	getActivePlatformAdminByUserId: vi.fn(),
}));

vi.mock("../auth/auth.rpc", () => ({
	getAppUserFn: mocks.getAppUserFn,
}));

vi.mock("./platform-admin-queries.server", () => ({
	getActivePlatformAdminByUserId: mocks.getActivePlatformAdminByUserId,
}));

import {
	PLATFORM_AUTH_ERRORS,
	requirePlatformAdmin,
} from "./platform-guards.server";

describe("requirePlatformAdmin", () => {
	afterEach(() => {
		vi.resetAllMocks();
	});

	it("allows active platform admin", async () => {
		mocks.getAppUserFn.mockResolvedValue({
			id: "user-1",
			email: "ops@thehardblok.com",
			name: "Ops",
			role: "owner",
		});
		mocks.getActivePlatformAdminByUserId.mockResolvedValue({
			id: "pa-1",
			userId: "user-1",
			role: "platform_admin",
			isActive: true,
		});

		const result = await requirePlatformAdmin();

		expect(result.platformAdmin.role).toBe("platform_admin");
		expect(result.user.email).toBe("ops@thehardblok.com");
	});

	it("forbids business owner without platform_admins row", async () => {
		mocks.getAppUserFn.mockResolvedValue({
			id: "biz-owner",
			email: "owner@cafe.com",
			name: "Cafe Owner",
			role: "owner",
		});
		mocks.getActivePlatformAdminByUserId.mockResolvedValue(null);

		await expect(requirePlatformAdmin()).rejects.toThrow(
			PLATFORM_AUTH_ERRORS.FORBIDDEN,
		);
	});

	it("requires session", async () => {
		mocks.getAppUserFn.mockResolvedValue(null);

		await expect(requirePlatformAdmin()).rejects.toThrow(
			PLATFORM_AUTH_ERRORS.UNAUTHORIZED,
		);
	});
});
