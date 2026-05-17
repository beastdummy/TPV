import { afterEach, describe, expect, it } from "vitest";

import { getDefaultBusinessConfig } from "./config.server";

describe("getDefaultBusinessConfig", () => {
	const originalSlug = process.env.DEFAULT_BUSINESS_SLUG;
	const originalName = process.env.DEFAULT_BUSINESS_NAME;

	afterEach(() => {
		if (originalSlug === undefined) {
			delete process.env.DEFAULT_BUSINESS_SLUG;
		} else {
			process.env.DEFAULT_BUSINESS_SLUG = originalSlug;
		}
		if (originalName === undefined) {
			delete process.env.DEFAULT_BUSINESS_NAME;
		} else {
			process.env.DEFAULT_BUSINESS_NAME = originalName;
		}
	});

	it("uses defaults when env is unset", () => {
		delete process.env.DEFAULT_BUSINESS_SLUG;
		delete process.env.DEFAULT_BUSINESS_NAME;

		expect(getDefaultBusinessConfig()).toEqual({
			slug: "default",
			name: "The Hard Blok",
		});
	});

	it("reads slug and name from env", () => {
		process.env.DEFAULT_BUSINESS_SLUG = "mi-tienda";
		process.env.DEFAULT_BUSINESS_NAME = "Mi Tienda";

		expect(getDefaultBusinessConfig()).toEqual({
			slug: "mi-tienda",
			name: "Mi Tienda",
		});
	});

	it("rejects invalid slug", () => {
		process.env.DEFAULT_BUSINESS_SLUG = "Invalid_Slug";

		expect(() => getDefaultBusinessConfig()).toThrow(/DEFAULT_BUSINESS_SLUG/);
	});

	it("rejects empty name", () => {
		process.env.DEFAULT_BUSINESS_NAME = "   ";

		expect(() => getDefaultBusinessConfig()).toThrow(/DEFAULT_BUSINESS_NAME/);
	});
});
