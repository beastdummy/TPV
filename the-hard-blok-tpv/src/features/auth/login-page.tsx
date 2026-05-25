import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { authClient } from "../../lib/auth-client";
import {
	getPostLoginPath,
	resolveReturnTo,
	stashAuthRedirects,
	type AuthEntrySearch,
} from "../../lib/auth-redirect";

type LoginPageProps = {
	mode: "login" | "register";
	search: AuthEntrySearch;
	oauth: { google: boolean };
};

export function LoginPage({ mode, search, oauth }: LoginPageProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const isRegister = mode === "register";
	const title = isRegister ? "Crear cuenta" : "Iniciar sesión";
	const subtitle = isRegister
		? "Regístrate con Google. Usarás la misma cuenta en el TPV y en el panel web."
		: "Accede con Google para continuar.";

	async function handleGoogleSignIn() {
		if (!oauth.google) {
			return;
		}
		setErrorMessage(null);
		setIsSubmitting(true);

		try {
			stashAuthRedirects(search);
			await authClient.signIn.social({
				provider: "google",
				callbackURL: getPostLoginPath(),
			});
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
					: "No se pudo continuar con Google.",
			);
			setIsSubmitting(false);
		}
	}

	const returnTo = resolveReturnTo(search);

	return (
		<div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
			<div className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-sm">
				<div className="mb-6">
					<p className="text-sm text-muted-foreground">The Hard Blok TPV</p>
					<h1 className="mt-1 text-2xl font-semibold">{title}</h1>
					<p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
					{returnTo ? (
						<p className="mt-2 text-xs text-muted-foreground">
							Tras Google volverás a la web comercial.
						</p>
					) : null}
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
							Guía:{" "}
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
						{isSubmitting
							? "Redirigiendo..."
							: isRegister
								? "Registrarse con Google"
								: "Continuar con Google"}
					</button>

					<Link
						to={isRegister ? "/login" : "/register"}
						search={search}
						className="inline-flex w-full items-center justify-center rounded-2xl border bg-background px-4 py-3 text-sm font-medium transition hover:bg-muted"
					>
						{isRegister ? "Ya tengo cuenta" : "Crear cuenta"}
					</Link>

					<Link
						to="/"
						className="inline-flex w-full items-center justify-center rounded-2xl border border-transparent px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-muted"
					>
						Volver
					</Link>
				</div>
			</div>
		</div>
	);
}
