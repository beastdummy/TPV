import { describe, expect, it } from "vitest";

import {
	buildAssignableRolesList,
	hasUniqueAssignableRoleIds,
} from "./assignable-roles";

describe("buildAssignableRolesList", () => {
	it("returns only business_roles entries", () => {
		const roles = buildAssignableRolesList([
			{
				id: "role-cajero",
				slug: "cajero",
				name: "Cajero TPV",
			},
			{
				id: "role-manager",
				slug: "manager",
				name: "Encargado",
			},
		]);

		expect(roles).toHaveLength(2);
		expect(roles.map((role) => role.slug)).toEqual(["cajero", "manager"]);
	});

	it("returns empty list when business has no custom roles", () => {
		expect(buildAssignableRolesList([])).toEqual([]);
	});

	it("dedupes duplicate custom rows by slug (keeps first)", () => {
		const roles = buildAssignableRolesList([
			{ id: "role-a", slug: "manager", name: "Manager A" },
			{ id: "role-b", slug: "manager", name: "Manager B" },
		]);

		expect(roles).toHaveLength(1);
		expect(roles[0]?.id).toBe("role-a");
	});

	it("produces unique React keys", () => {
		const roles = buildAssignableRolesList([
			{ id: "role-manager", slug: "manager", name: "Encargado" },
			{ id: "role-cashier", slug: "cashier", name: "Cajero" },
		]);

		expect(hasUniqueAssignableRoleIds(roles)).toBe(true);
	});
});
