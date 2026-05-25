import { createFileRoute, redirect } from "@tanstack/react-router";

import { getAppUserFn, getOAuthSetupFn } from "../features/auth/auth.rpc";
import { LoginPage } from "../features/auth/login-page";
import {
	resolveInternalRedirect,
	resolveReturnTo,
	type AuthEntrySearch,
} from "../lib/auth-redirect";

export const Route = createFileRoute("/register")({
	validateSearch: (search: Record<string, unknown>): AuthEntrySearch => ({
		redirect: typeof search.redirect === "string" ? search.redirect : undefined,
		returnTo: typeof search.returnTo === "string" ? search.returnTo : undefined,
	}),
	beforeLoad: async ({ search }) => {
		const user = await getAppUserFn();

		if (user) {
			const returnTo = resolveReturnTo(search);
			if (returnTo) {
				throw redirect({ href: returnTo });
			}
			throw redirect({ to: resolveInternalRedirect(search.redirect) });
		}
	},
	loader: async () => {
		return await getOAuthSetupFn();
	},
	component: RegisterRoute,
});

function RegisterRoute() {
	const search = Route.useSearch();
	const oauth = Route.useLoaderData();

	return <LoginPage mode="register" search={search} oauth={oauth} />;
}
