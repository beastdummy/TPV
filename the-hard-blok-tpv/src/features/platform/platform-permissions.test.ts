import { describe, expect, it } from "vitest";

import {
	PLATFORM_PERMISSIONS,
	PLATFORM_ROLE_PERMISSIONS,
	platformRoleHasPermission,
} from "./platform-permissions";
import type { PlatformRole } from "./types";

describe("platform permissions", () => {
	it("owner has every platform permission", () => {
		for (const permission of PLATFORM_PERMISSIONS) {
			expect(platformRoleHasPermission("owner", permission)).toBe(true);
		}
	});

	it("dev can access technical permissions", () => {
		expect(platformRoleHasPermission("dev", "platform.debug.read")).toBe(true);
		expect(platformRoleHasPermission("dev", "platform.features.manage")).toBe(
			true,
		);
	});

	it("billing cannot access dev/debug permissions", () => {
		expect(platformRoleHasPermission("billing", "platform.debug.read")).toBe(
			false,
		);
		expect(
			platformRoleHasPermission("billing", "platform.features.manage"),
		).toBe(false);
		expect(
			platformRoleHasPermission("billing", "platform.billing.manage"),
		).toBe(true);
	});

	it("viewer is read-only on dashboard and catalogs", () => {
		expect(platformRoleHasPermission("viewer", "platform.dashboard.view")).toBe(
			true,
		);
		expect(
			platformRoleHasPermission("viewer", "platform.businesses.manage"),
		).toBe(false);
	});

	it("defines permissions for every platform role", () => {
		const roles: PlatformRole[] = [
			"owner",
			"dev",
			"admin",
			"support",
			"moderator",
			"billing",
			"viewer",
		];

		for (const role of roles) {
			expect(PLATFORM_ROLE_PERMISSIONS[role].length).toBeGreaterThan(0);
		}
	});
});
