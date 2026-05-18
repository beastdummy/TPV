import { describe, expect, it } from "vitest";

import { hasBusinessRole, roleMeetsRequirement } from "./tenant-guards.server";

describe("role hierarchy", () => {
	it("owner satisfies manager requirement", () => {
		expect(roleMeetsRequirement("owner", "manager")).toBe(true);
	});

	it("admin satisfies manager requirement", () => {
		expect(roleMeetsRequirement("admin", "manager")).toBe(true);
	});

	it("cashier does not satisfy manager requirement", () => {
		expect(roleMeetsRequirement("cashier", "manager")).toBe(false);
	});

	it("manager does not satisfy owner requirement", () => {
		expect(roleMeetsRequirement("manager", "owner")).toBe(false);
	});
});

describe("hasBusinessRole", () => {
	it("allows owner for catalog-style roles", () => {
		expect(hasBusinessRole("owner", ["manager"])).toBe(true);
	});

	it("denies cashier for manager requirement", () => {
		expect(hasBusinessRole("cashier", ["manager"])).toBe(false);
	});

	it("allows any role when cashier is the minimum required", () => {
		expect(hasBusinessRole("cashier", ["cashier"])).toBe(true);
		expect(hasBusinessRole("owner", ["cashier"])).toBe(true);
	});

	it("returns false for empty allowed list", () => {
		expect(hasBusinessRole("owner", [])).toBe(false);
	});
});
