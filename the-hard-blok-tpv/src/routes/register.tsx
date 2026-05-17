import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { getAppUserFn } from "../features/auth/auth.rpc";
import { isRegisterCustomerError } from "../features/auth/register.errors";
import { registerCustomerOwnerFn } from "../features/auth/register.rpc";

type RegisterSearch = {
	redirect?: string;
};

export const Route = createFileRoute("/register")({
	validateSearch: (search: Record<string, unknown>): RegisterSearch => ({
		redirect: typeof search.redirect === "string" ? search.redirect : undefined,
	}),
	beforeLoad: async () => {
		const user = await getAppUserFn();
		if (user) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: RegisterPage,
});

function RegisterPage() {
	const search = Route.useSearch();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [form, setForm] = useState({
		userName: "",
		email: "",
		password: "",
		businessName: "",
		businessSlug: "",
	});

	function resolveRedirectPath(redirectTo: string) {
		if (search.redirect?.startsWith("/")) {
			return search.redirect;
		}
		return redirectTo.startsWith("/") ? redirectTo : "/sales";
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setErrorMessage(null);
		setIsSubmitting(true);

		try {
			const result = await registerCustomerOwnerFn({
				data: {
					userName: form.userName,
					email: form.email,
					password: form.password,
					businessName: form.businessName,
					businessSlug: form.businessSlug || undefined,
				},
			});

			window.location.assign(resolveRedirectPath(result.redirectTo));
		} catch (error) {
			if (isRegisterCustomerError(error)) {
				setErrorMessage(error.message);
			} else if (error instanceof Error) {
				setErrorMessage(error.message);
			} else {
				setErrorMessage("No se pudo completar el registro.");
			}
			setIsSubmitting(false);
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
			<div className="w-full max-w-lg rounded-3xl border bg-card p-6 shadow-sm">
				<div className="mb-6">
					<p className="text-sm text-muted-foreground">The Hard Blok TPV</p>
					<h1 className="mt-1 text-2xl font-semibold">Crear cuenta</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						Registra tu negocio y empieza a usar el TPV.
					</p>
				</div>

				<form className="space-y-4" onSubmit={handleSubmit}>
					{errorMessage ? (
						<p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
							{errorMessage}
						</p>
					) : null}

					<label className="block space-y-1.5 text-sm">
						<span className="font-medium">Tu nombre</span>
						<input
							type="text"
							required
							autoComplete="name"
							value={form.userName}
							onChange={(event) =>
								setForm((current) => ({
									...current,
									userName: event.target.value,
								}))
							}
							className="w-full rounded-2xl border bg-background px-3 py-2.5 outline-none ring-primary/30 focus:ring-2"
						/>
					</label>

					<label className="block space-y-1.5 text-sm">
						<span className="font-medium">Email</span>
						<input
							type="email"
							required
							autoComplete="email"
							value={form.email}
							onChange={(event) =>
								setForm((current) => ({
									...current,
									email: event.target.value,
								}))
							}
							className="w-full rounded-2xl border bg-background px-3 py-2.5 outline-none ring-primary/30 focus:ring-2"
						/>
					</label>

					<label className="block space-y-1.5 text-sm">
						<span className="font-medium">Contraseña</span>
						<input
							type="password"
							required
							minLength={8}
							autoComplete="new-password"
							value={form.password}
							onChange={(event) =>
								setForm((current) => ({
									...current,
									password: event.target.value,
								}))
							}
							className="w-full rounded-2xl border bg-background px-3 py-2.5 outline-none ring-primary/30 focus:ring-2"
						/>
					</label>

					<label className="block space-y-1.5 text-sm">
						<span className="font-medium">Nombre del negocio</span>
						<input
							type="text"
							required
							value={form.businessName}
							onChange={(event) =>
								setForm((current) => ({
									...current,
									businessName: event.target.value,
								}))
							}
							className="w-full rounded-2xl border bg-background px-3 py-2.5 outline-none ring-primary/30 focus:ring-2"
						/>
					</label>

					<label className="block space-y-1.5 text-sm">
						<span className="font-medium">
							Slug del negocio{" "}
							<span className="font-normal text-muted-foreground">
								(opcional)
							</span>
						</span>
						<input
							type="text"
							placeholder="mi-cafeteria"
							value={form.businessSlug}
							onChange={(event) =>
								setForm((current) => ({
									...current,
									businessSlug: event.target.value,
								}))
							}
							className="w-full rounded-2xl border bg-background px-3 py-2.5 outline-none ring-primary/30 focus:ring-2"
						/>
					</label>

					<button
						type="submit"
						disabled={isSubmitting}
						className="inline-flex w-full items-center justify-center rounded-2xl border border-primary bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
					>
						{isSubmitting ? "Creando cuenta..." : "Crear cuenta y entrar"}
					</button>

					<Link
						to="/login"
						className="inline-flex w-full items-center justify-center rounded-2xl border bg-background px-4 py-3 text-sm font-medium transition hover:bg-muted"
					>
						Ya tengo cuenta
					</Link>
				</form>
			</div>
		</div>
	);
}
