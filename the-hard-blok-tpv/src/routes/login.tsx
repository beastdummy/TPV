import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { getAppUserFn, getOAuthSetupFn } from "../features/auth/auth.rpc";
import { authClient } from "../lib/auth-client";

type LoginSearch = {
	redirect?: string;
};

export const Route = createFileRoute("/login")({
	validateSearch: (search: Record<string, unknown>): LoginSearch => ({
		redirect: typeof search.redirect === "string" ? search.redirect : undefined,
	}),
	beforeLoad: async () => {
		const user = await getAppUserFn();
		if (user) {
			throw redirect({ to: "/dashboard" });
		}
	},
	loader: async () => {
		return await getOAuthSetupFn();
	},
	component: LoginPage,
});

function LoginPage() {
	const search = Route.useSearch();
	const oauth = Route.useLoaderData();

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	async function handleGoogleSignIn() {
		if (!oauth.google) {
			return;
		}
		setErrorMessage(null);
		setIsSubmitting(true);

		try {
			await authClient.signIn.social({
				provider: "google",
				callbackURL: search.redirect?.startsWith("/")
					? search.redirect
					: "/dashboard",
			});
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
					: "No se pudo iniciar sesión con Google.",
			);
			setIsSubmitting(false);
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
			<div className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-sm">
				<div className="mb-6">
					<p className="text-sm text-muted-foreground">The Hard Blok TPV</p>
					<h1 className="mt-1 text-2xl font-semibold">Iniciar sesión</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						Accede con Google para continuar.
					</p>
				</div>

				<div className="space-y-4">
					{!oauth.google ? (
						<p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
							Falta Google en{" "}
							<code className="rounded bg-amber-100/80 px-1">.env</code>: copia{" "}
							<code className="rounded bg-amber-100/80 px-1">.env.example</code>
							, rellena{" "}
							<code className="rounded bg-amber-100/80 px-1">
								GOOGLE_CLIENT_ID
							</code>{" "}
							y{" "}
							<code className="rounded bg-amber-100/80 px-1">
								GOOGLE_CLIENT_SECRET
							</code>
							, reinicia{" "}
							<code className="rounded bg-amber-100/80 px-1">npm run dev</code>.
							Guía paso a paso:{" "}
							<code className="rounded bg-amber-100/80 px-1">
								docs/variables-entorno-y-google.md
							</code>
						</p>
					) : null}
					{errorMessage ? (
						<p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
							{errorMessage}
						</p>
					) : null}

					<button
						type="button"
						onClick={handleGoogleSignIn}
						disabled={isSubmitting || !oauth.google}
						className="inline-flex w-full items-center justify-center rounded-2xl border border-primary bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
					>
						{isSubmitting ? "Redirigiendo..." : "Continuar con Google"}
					</button>

					<Link
						to="/"
						className="inline-flex w-full items-center justify-center rounded-2xl border bg-background px-4 py-3 text-sm font-medium transition hover:bg-muted"
					>
						Volver
					</Link>
				</div>
			</div>
		</div>
	);
}
