import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Pencil, PlusCircle, X } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminShell } from "../../components/layout/admin-shell";
import { requireBusinessPermissionForRoute } from "../../features/auth/route-guards";
import {
	createEmployeeForAdminFn,
	getAssignableRolesForAdminFn,
	getEmployeesForAdminFn,
	updateEmployeeForAdminFn,
} from "../../features/business-staff/staff.server-fns";
import type { BusinessEmployeeRow } from "../../features/business-staff/types";

export const Route = createFileRoute("/admin/employees")({
	beforeLoad: async ({ location }) => {
		await requireBusinessPermissionForRoute("employees.view", location.href);
	},
	loader: async () => {
		const [employees, roles] = await Promise.all([
			getEmployeesForAdminFn(),
			getAssignableRolesForAdminFn(),
		]);
		return { employees, roles };
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
	const { employees, roles } = Route.useLoaderData();
	const router = useRouter();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editing, setEditing] = useState<BusinessEmployeeRow | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [form, setForm] = useState<EmployeeForm>({
		name: "",
		email: "",
		role_slug: roles[0]?.slug ?? "cashier",
		status: "active",
		pin: "",
		clear_pin: false,
	});

	const assignableRoles = useMemo(() => roles, [roles]);

	function openCreate() {
		setEditing(null);
		setForm({
			name: "",
			email: "",
			role_slug: assignableRoles[0]?.slug ?? "cashier",
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
							<select
								className="w-full rounded-2xl border px-4 py-3 text-sm"
								value={form.role_slug}
								onChange={(e) =>
									setForm((prev) => ({ ...prev, role_slug: e.target.value }))
								}
							>
								{assignableRoles.map((role) => (
									<option key={role.slug} value={role.slug}>
										{role.name}
									</option>
								))}
							</select>
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
									disabled={isSubmitting}
									className="rounded-2xl border border-primary bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
								>
									{isSubmitting ? "Guardando..." : "Guardar"}
								</button>
							</div>
						</form>
					</div>
				</div>
			) : null}
		</>
	);
}
