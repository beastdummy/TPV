import { createFileRoute, useRouter } from "@tanstack/react-router";
import { KeyRound, Pencil, PlusCircle, X } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminShell } from "../../components/layout/admin-shell";
import { requireBusinessPermissionForRoute } from "../../features/auth/route-guards";
import { buildAssignableRolesList } from "../../features/business-staff/assignable-roles";
import {
	createEmployeeForAdminFn,
	getAssignableRolesForAdminFn,
	getEmployeesForAdminFn,
	getMyPosPinStatusFn,
	setMyPosPinFn,
	updateEmployeeForAdminFn,
} from "../../features/business-staff/staff.server-fns";
import type { BusinessEmployeeRow } from "../../features/business-staff/types";

export const Route = createFileRoute("/admin/employees")({
	beforeLoad: async ({ location }) => {
		await requireBusinessPermissionForRoute("employees.view", location.href);
	},
	loader: async () => {
		const [employees, roles, pinStatus] = await Promise.all([
			getEmployeesForAdminFn(),
			getAssignableRolesForAdminFn(),
			getMyPosPinStatusFn(),
		]);
		return { employees, roles, pinStatus };
	},
	component: AdminEmployeesPage,
});

type EmployeeForm = {
	name: string;
	email: string;
	role_slug: string;
	status: "active" | "suspended";
	pin: string;
	clear_pin: boolean;
};

function AdminEmployeesPage() {
	const { employees, roles, pinStatus } = Route.useLoaderData();
	const router = useRouter();
	const [isPinModalOpen, setIsPinModalOpen] = useState(false);
	const [myPin, setMyPin] = useState("");
	const [myPinConfirm, setMyPinConfirm] = useState("");
	const [pinMessage, setPinMessage] = useState<string | null>(null);
	const [isPinSubmitting, setIsPinSubmitting] = useState(false);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editing, setEditing] = useState<BusinessEmployeeRow | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [form, setForm] = useState<EmployeeForm>({
		name: "",
		email: "",
		role_slug: roles[0]?.slug ?? "",
		status: "active",
		pin: "",
		clear_pin: false,
	});

	const assignableRoles = useMemo(() => {
		const options = buildAssignableRolesList(
			roles.map((role) => ({
				id: role.id,
				slug: role.slug,
				name: role.name,
			})),
		);

		if (
			editing &&
			editing.role_slug !== "owner" &&
			!options.some((role) => role.slug === editing.role_slug)
		) {
			return [
				{
					id: `current:${editing.membership_id}`,
					slug: editing.role_slug,
					name: editing.role_name || editing.role_slug,
				},
				...options,
			];
		}

		return options;
	}, [roles, editing]);

	function openCreate() {
		setEditing(null);
		setForm({
			name: "",
			email: "",
			role_slug: assignableRoles[0]?.slug ?? "",
			status: "active",
			pin: "",
			clear_pin: false,
		});
		setIsModalOpen(true);
	}

	function openEdit(employee: BusinessEmployeeRow) {
		setEditing(employee);
		setForm({
			name: employee.name,
			email: employee.email,
			role_slug: employee.role_slug,
			status: employee.status === "suspended" ? "suspended" : "active",
			pin: "",
			clear_pin: false,
		});
		setIsModalOpen(true);
	}

	function closeModal() {
		setIsModalOpen(false);
		setEditing(null);
		setIsSubmitting(false);
	}

	async function handleSaveMyPin(e: React.FormEvent) {
		e.preventDefault();
		setPinMessage(null);

		if (myPin !== myPinConfirm) {
			setPinMessage("Los PIN no coinciden.");
			return;
		}

		setIsPinSubmitting(true);
		try {
			await setMyPosPinFn({ data: { pin: myPin } });
			setMyPin("");
			setMyPinConfirm("");
			setIsPinModalOpen(false);
			setPinMessage("PIN TPV guardado.");
			await router.invalidate();
		} catch (error) {
			setPinMessage(
				error instanceof Error ? error.message : "No se pudo guardar el PIN.",
			);
		} finally {
			setIsPinSubmitting(false);
		}
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setIsSubmitting(true);

		try {
			if (editing) {
				await updateEmployeeForAdminFn({
					data: {
						membership_id: editing.membership_id,
						name: form.name,
						email: form.email,
						role_slug: form.role_slug,
						status: form.status,
						pin: form.pin || undefined,
						clear_pin: form.clear_pin,
					},
				});
			} else {
				await createEmployeeForAdminFn({
					data: {
						name: form.name,
						email: form.email,
						role_slug: form.role_slug,
						status: form.status,
						pin: form.pin || undefined,
					},
				});
			}

			closeModal();
			await router.invalidate();
		} catch (error) {
			window.alert(
				error instanceof Error ? error.message : "No se pudo guardar.",
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<>
			<AdminShell
				title="Empleados"
				description="Gestiona el equipo de tu negocio y asigna roles con permisos."
				actions={
					<button
						type="button"
						onClick={openCreate}
						className="inline-flex items-center gap-2 rounded-2xl border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
					>
						<PlusCircle className="h-4 w-4" />
						Nuevo empleado
					</button>
				}
			>
				<div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border bg-muted/20 px-5 py-4">
					<div className="flex items-center gap-3">
						<div className="rounded-2xl border bg-card p-2">
							<KeyRound className="h-4 w-4" />
						</div>
						<div>
							<p className="font-medium">Mi PIN TPV</p>
							<p className="text-sm text-muted-foreground">
								{pinStatus.has_pin
									? "PIN configurado. Puedes actualizarlo cuando quieras."
									: "Configura tu PIN para operar en el TPV."}
								{pinStatus.is_owner ? " (propietario)" : null}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={() => {
							setPinMessage(null);
							setMyPin("");
							setMyPinConfirm("");
							setIsPinModalOpen(true);
						}}
						className="rounded-2xl border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
					>
						Configurar mi PIN TPV
					</button>
				</div>

				<div className="overflow-hidden rounded-3xl border bg-background">
					<div className="grid grid-cols-[1.4fr_1.4fr_1fr_120px_100px_100px] gap-4 border-b px-5 py-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">
						<span>Nombre</span>
						<span>Email</span>
						<span>Rol</span>
						<span>Estado</span>
						<span>PIN</span>
						<span>Acciones</span>
					</div>

					<div className="divide-y">
						{employees.map((employee) => (
							<div
								key={employee.membership_id}
								className="grid grid-cols-[1.4fr_1.4fr_1fr_120px_100px_100px] gap-4 px-5 py-4 text-sm"
							>
								<p className="font-semibold">{employee.name}</p>
								<p className="text-muted-foreground">{employee.email}</p>
								<p>{employee.role_name}</p>
								<span
									className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${
										employee.status === "active"
											? "bg-emerald-100 text-emerald-700"
											: "bg-muted text-muted-foreground"
									}`}
								>
									{employee.status === "active" ? "Activo" : "Suspendido"}
								</span>
								<p className="text-muted-foreground">
									{employee.has_pin ? "Sí" : "No"}
								</p>
								<div>
									{employee.role_slug !== "owner" ? (
										<button
											type="button"
											onClick={() => openEdit(employee)}
											className="rounded-xl border bg-background p-2 hover:bg-muted"
											aria-label={`Editar ${employee.name}`}
										>
											<Pencil className="h-4 w-4" />
										</button>
									) : (
										<span className="text-xs text-muted-foreground">
											Propietario
										</span>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			</AdminShell>

			{isModalOpen ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border bg-card shadow-2xl">
						<div className="flex items-start justify-between border-b px-6 py-5">
							<h2 className="text-xl font-semibold">
								{editing ? "Editar empleado" : "Nuevo empleado"}
							</h2>
							<button
								type="button"
								onClick={closeModal}
								className="rounded-xl border p-2"
							>
								<X className="h-4 w-4" />
							</button>
						</div>
						<form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
							<input
								className="w-full rounded-2xl border px-4 py-3 text-sm"
								placeholder="Nombre"
								value={form.name}
								onChange={(e) =>
									setForm((prev) => ({ ...prev, name: e.target.value }))
								}
								required
							/>
							<input
								type="email"
								className="w-full rounded-2xl border px-4 py-3 text-sm"
								placeholder="Email"
								value={form.email}
								onChange={(e) =>
									setForm((prev) => ({ ...prev, email: e.target.value }))
								}
								required
							/>
							<label className="block space-y-1 text-sm">
								<span className="font-medium">Rol</span>
								<select
									className="w-full rounded-2xl border px-4 py-3 text-sm"
									value={form.role_slug}
									onChange={(e) =>
										setForm((prev) => ({
											...prev,
											role_slug: e.target.value,
										}))
									}
									required
									disabled={assignableRoles.length === 0}
								>
									{assignableRoles.length === 0 ? (
										<option value="">
											Crea un rol en Administración → Roles
										</option>
									) : (
										assignableRoles.map((role) => (
											<option key={role.id} value={role.slug}>
												{role.name}
											</option>
										))
									)}
								</select>
								{assignableRoles.length === 0 ? (
									<p className="text-xs text-muted-foreground">
										Necesitas al menos un rol personalizado antes de dar de alta
										empleados.
									</p>
								) : null}
							</label>
							<select
								className="w-full rounded-2xl border px-4 py-3 text-sm"
								value={form.status}
								onChange={(e) =>
									setForm((prev) => ({
										...prev,
										status: e.target.value as "active" | "suspended",
									}))
								}
							>
								<option value="active">Activo</option>
								<option value="suspended">Suspendido</option>
							</select>
							<input
								className="w-full rounded-2xl border px-4 py-3 text-sm"
								placeholder="PIN TPV (4-8 dígitos, opcional)"
								value={form.pin}
								onChange={(e) =>
									setForm((prev) => ({ ...prev, pin: e.target.value }))
								}
								pattern="\d{4,8}"
							/>
							{editing?.has_pin ? (
								<label className="flex items-center gap-2 text-sm">
									<input
										type="checkbox"
										checked={form.clear_pin}
										onChange={(e) =>
											setForm((prev) => ({
												...prev,
												clear_pin: e.target.checked,
											}))
										}
									/>
									Eliminar PIN actual
								</label>
							) : null}
							<div className="flex justify-end gap-3 border-t pt-4">
								<button
									type="button"
									onClick={closeModal}
									className="rounded-2xl border px-4 py-2 text-sm"
								>
									Cancelar
								</button>
								<button
									type="submit"
									disabled={
										isSubmitting ||
										!form.role_slug ||
										(!editing && assignableRoles.length === 0)
									}
									className="rounded-2xl border border-primary bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
								>
									{isSubmitting ? "Guardando..." : "Guardar"}
								</button>
							</div>
						</form>
					</div>
				</div>
			) : null}

			{isPinModalOpen ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-2xl">
						<div className="mb-4 flex items-center justify-between">
							<h2 className="text-xl font-semibold">Configurar mi PIN TPV</h2>
							<button type="button" onClick={() => setIsPinModalOpen(false)}>
								<X className="h-4 w-4" />
							</button>
						</div>
						<form onSubmit={handleSaveMyPin} className="space-y-4">
							<input
								type="password"
								inputMode="numeric"
								autoComplete="off"
								className="w-full rounded-2xl border px-4 py-3 text-sm"
								placeholder="PIN (4-8 dígitos)"
								value={myPin}
								onChange={(e) =>
									setMyPin(e.target.value.replace(/\D/g, "").slice(0, 8))
								}
								required
							/>
							<input
								type="password"
								inputMode="numeric"
								autoComplete="off"
								className="w-full rounded-2xl border px-4 py-3 text-sm"
								placeholder="Confirmar PIN"
								value={myPinConfirm}
								onChange={(e) =>
									setMyPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 8))
								}
								required
							/>
							<button
								type="submit"
								disabled={isPinSubmitting}
								className="w-full rounded-2xl border border-primary bg-primary py-2 text-sm text-primary-foreground"
							>
								{isPinSubmitting ? "Guardando..." : "Guardar PIN"}
							</button>
						</form>
						{pinMessage ? (
							<p className="mt-3 text-sm text-muted-foreground">{pinMessage}</p>
						) : null}
					</div>
				</div>
			) : null}
		</>
	);
}
