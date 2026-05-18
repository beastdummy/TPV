import { describe, expect, it } from "vitest";

import { normalizeRolesPageData } from "./roles-page-data";

describe("normalizeRolesPageData", () => {
	it("accepts { roles, owner } shape", () => {
		const data = normalizeRolesPageData({
			roles: [
				{
					id: "r1",
					business_id: "b1",
					slug: "cajero",
					name: "Cajero",
					description: "",
					is_system: false,
					member_count: 0,
				},
			],
			owner: {
				slug: "owner",
				name: "Propietario",
				description: "Acceso total automático",
				member_count: 1,
				is_system: true,
			},
		});

		expect(data.roles).toHaveLength(1);
		expect(data.owner.member_count).toBe(1);
	});

	it("unwraps double-nested roles payload", () => {
		const data = normalizeRolesPageData({
			roles: {
				roles: [
					{
						id: "r1",
						business_id: "b1",
						slug: "cajero",
						name: "Cajero",
						description: "",
						is_system: false,
						member_count: 0,
					},
				],
				owner: {
					slug: "owner",
					name: "Propietario",
					description: "",
					member_count: 2,
					is_system: true,
				},
			},
		});

		expect(data.roles).toHaveLength(1);
		expect(data.owner.member_count).toBe(2);
	});

	it("returns empty array for invalid payload", () => {
		expect(normalizeRolesPageData(null).roles).toEqual([]);
		expect(normalizeRolesPageData(undefined).roles).toEqual([]);
	});
});
