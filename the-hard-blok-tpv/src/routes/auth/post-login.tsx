import { createFileRoute, redirect } from "@tanstack/react-router";
import { useLayoutEffect } from "react";

import { getAppUserFn } from "../../features/auth/auth.rpc";
import {
	consumeStashedInternalRedirect,
	consumeStashedWebReturnTo,
	resolveInternalRedirect,
	resolveReturnTo,
	type AuthEntrySearch,
} from "../../lib/auth-redirect";

export const Route = createFileRoute("/auth/post-login")({
	validateSearch: (search: Record<string, unknown>): AuthEntrySearch => ({
		redirect: typeof search.redirect === "string" ? search.redirect : undefined,
		returnTo: typeof search.returnTo === "string" ? search.returnTo : undefined,
	}),
	beforeLoad: async ({ search }) => {
		const user = await getAppUserFn();

		if (!user) {
			throw redirect({
				to: "/login",
				search: {
					returnTo: search.returnTo,
					redirect: search.redirect,
				},
			});
		}

		const returnTo = resolveReturnTo(search);
		if (returnTo) {
			throw redirect({ href: returnTo });
		}

		throw redirect({ to: resolveInternalRedirect(search.redirect) });
	},
	component: PostLoginPage,
});

function PostLoginPage() {
	useLayoutEffect(() => {
		const storedWeb = consumeStashedWebReturnTo();
		if (storedWeb) {
			window.location.replace(storedWeb);
			return;
		}

		const storedInternal = consumeStashedInternalRedirect();
		if (storedInternal) {
			window.location.replace(storedInternal);
			return;
		}

		window.location.replace("/dashboard");
	}, []);

	return (
		<main className="flex min-h-screen items-center justify-center px-4">
			<p className="text-sm text-muted-foreground">Completando acceso…</p>
		</main>
	);
}
