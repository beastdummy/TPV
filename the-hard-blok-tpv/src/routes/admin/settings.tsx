import { createFileRoute } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { useState } from "react";

import { AdminShell } from "../../components/layout/admin-shell";
import { requireBusinessPermissionForRoute } from "../../features/auth/route-guards";
import {
	getMyPosPinStatusFn,
	setMyPosPinFn,
} from "../../features/business-staff/staff.server-fns";

export const Route = createFileRoute("/admin/settings")({
	beforeLoad: async ({ location }) => {
		await requireBusinessPermissionForRoute("settings.view", location.href);
	},
	loader: async () => {
		return { pinStatus: await getMyPosPinStatusFn() };
	},
	component: AdminSettingsPage,
});

function AdminSettingsPage() {
	const { pinStatus } = Route.useLoaderData();
	const [pin, setPin] = useState("");
	const [confirmPin, setConfirmPin] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	async function handleSavePin(e: React.FormEvent) {
		e.preventDefault();
		setMessage(null);

		if (pin !== confirmPin) {
			setMessage("Los PIN no coinciden.");
			return;
		}

		setIsSubmitting(true);
		try {
			await setMyPosPinFn({ data: { pin } });
			setPin("");
			setConfirmPin("");
			setMessage("PIN TPV guardado correctamente.");
		} catch (error) {
			setMessage(
				error instanceof Error ? error.message : "No se pudo guardar el PIN.",
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<AdminShell
			title="Configuración"
			description="Ajustes del negocio y acceso al TPV."
		>
			<div className="max-w-lg rounded-3xl border bg-background p-6">
				<div className="mb-4 flex items-center gap-3">
					<div className="rounded-2xl border bg-card p-3">
						<KeyRound className="h-5 w-5" />
					</div>
					<div>
						<h2 className="text-lg font-semibold">Configurar mi PIN TPV</h2>
						<p className="text-sm text-muted-foreground">
							{pinStatus.has_pin
								? "Ya tienes un PIN configurado. Introduce uno nuevo para reemplazarlo."
								: "Define un PIN de 4 a 8 dígitos para operar en el TPV."}
						</p>
					</div>
				</div>

				<form onSubmit={handleSavePin} className="space-y-4">
					<input
						type="password"
						inputMode="numeric"
						autoComplete="off"
						pattern="\d{4,8}"
						maxLength={8}
						className="w-full rounded-2xl border px-4 py-3 text-sm"
						placeholder="Nuevo PIN"
						value={pin}
						onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
						required
					/>
					<input
						type="password"
						inputMode="numeric"
						autoComplete="off"
						pattern="\d{4,8}"
						maxLength={8}
						className="w-full rounded-2xl border px-4 py-3 text-sm"
						placeholder="Confirmar PIN"
						value={confirmPin}
						onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
						required
					/>
					<button
						type="submit"
						disabled={isSubmitting}
						className="w-full rounded-2xl border border-primary bg-primary py-2 text-sm text-primary-foreground"
					>
						{isSubmitting ? "Guardando..." : "Guardar PIN TPV"}
					</button>
				</form>

				{message ? (
					<p className="mt-4 text-sm text-muted-foreground">{message}</p>
				) : null}

				<p className="mt-4 text-xs text-muted-foreground">
					El PIN nunca se muestra en claro. Solo tú puedes cambiar el PIN de tu
					cuenta.
				</p>
			</div>
		</AdminShell>
	);
}
