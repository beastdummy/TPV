import { describe, expect, it } from "vitest";

import {
	resolvePostLoginRedirect,
	shouldRedirectAuthenticatedFromAuthPage,
} from "./post-login-redirect";

describe("resolvePostLoginRedirect", () => {
	it("sends unauthenticated users to login", () => {
		expect(
			resolvePostLoginRedirect({
				authenticated: false,
				hasBusinessMembership: false,
				isPlatformOnly: false,
				setupCompleted: null,
			}),
		).toBe("/login");
	});

	it("sends platform-only operators to /platform", () => {
		expect(
			resolvePostLoginRedirect({
				authenticated: true,
				hasBusinessMembership: false,
				isPlatformOnly: true,
				setupCompleted: null,
			}),
		).toBe("/platform");
	});

	it("sends authenticated users without business to register", () => {
		expect(
			resolvePostLoginRedirect({
				authenticated: true,
				hasBusinessMembership: false,
				isPlatformOnly: false,
				setupCompleted: null,
			}),
		).toBe("/register");
	});

	it("sends business owners with incomplete setup to /setup", () => {
		expect(
			resolvePostLoginRedirect({
				authenticated: true,
				hasBusinessMembership: true,
				isPlatformOnly: false,
				setupCompleted: false,
			}),
		).toBe("/setup");
	});

	it("sends business owners with completed setup to /dashboard", () => {
		expect(
			resolvePostLoginRedirect({
				authenticated: true,
				hasBusinessMembership: true,
				isPlatformOnly: false,
				setupCompleted: true,
			}),
		).toBe("/dashboard");
	});

	it("allows register page only without session or tenant-less session", () => {
		expect(
			shouldRedirectAuthenticatedFromAuthPage({
				authenticated: false,
				hasBusinessMembership: false,
				isPlatformOnly: false,
				setupCompleted: null,
			}),
		).toBe(false);

		expect(
			shouldRedirectAuthenticatedFromAuthPage({
				authenticated: true,
				hasBusinessMembership: false,
				isPlatformOnly: false,
				setupCompleted: null,
			}),
		).toBe(false);

		expect(
			shouldRedirectAuthenticatedFromAuthPage({
				authenticated: true,
				hasBusinessMembership: true,
				isPlatformOnly: false,
				setupCompleted: false,
			}),
		).toBe(true);
	});
});
