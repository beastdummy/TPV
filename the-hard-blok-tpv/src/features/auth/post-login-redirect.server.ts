import { getBusinessSetupState } from "../business-setup/setup-state.server";
import { getActivePlatformAdminByUserId } from "../platform/platform-admin-queries.server";
import { resolveDefaultBusinessContext } from "../tenancy/context.server";
import { getAppUserFn } from "./auth.rpc";
import {
	type PostLoginRedirectContext,
	resolvePostLoginRedirect,
} from "./post-login-redirect";
import type { Role } from "./types";

export type SessionRedirectContext = PostLoginRedirectContext & {
	membershipRole: Role | null;
};

export async function getSessionRedirectContext(): Promise<SessionRedirectContext> {
	const user = await getAppUserFn();

	if (!user) {
		return {
			authenticated: false,
			hasBusinessMembership: false,
			isPlatformOnly: false,
			setupCompleted: null,
			membershipRole: null,
		};
	}

	const [business, platformAdmin] = await Promise.all([
		resolveDefaultBusinessContext(user.id),
		getActivePlatformAdminByUserId(user.id),
	]);

	let setupCompleted: boolean | null = null;

	if (business) {
		const setup = await getBusinessSetupState(business.businessId);
		setupCompleted = setup.setupCompleted;
	}

	const hasBusinessMembership = Boolean(business);
	const isPlatformOnly = Boolean(platformAdmin) && !hasBusinessMembership;

	return {
		authenticated: true,
		hasBusinessMembership,
		isPlatformOnly,
		setupCompleted,
		membershipRole: business?.role ?? null,
	};
}

export async function resolvePostLoginRedirectForSession(): Promise<PostLoginRedirectContext> {
	const ctx = await getSessionRedirectContext();
	return {
		authenticated: ctx.authenticated,
		hasBusinessMembership: ctx.hasBusinessMembership,
		isPlatformOnly: ctx.isPlatformOnly,
		setupCompleted: ctx.setupCompleted,
	};
}

export async function resolvePostLoginRedirectPathForSession() {
	const ctx = await getSessionRedirectContext();
	return resolvePostLoginRedirect(ctx);
}
