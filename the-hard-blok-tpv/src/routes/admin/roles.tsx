import { createFileRoute, useRouter } from "@tanstack/react-router";
import { PlusCircle, Shield, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminShell } from "../../components/layout/admin-shell";
import { requireBusinessPermissionForRoute } from "../../features/auth/route-guards";
import {
	BUSINESS_PERMISSION_ACTIONS,
	BUSINESS_PERMISSION_MODULES,
	type BusinessPermissionKey,
	buildPermissionKey,
	PERMISSION_ACTION_LABELS,
	PERMISSION_MODULE_LABELS,
} from "../../features/business-staff/permissions";
import { normalizeRolesPageData } from "../../features/business-staff/roles-page-data";
import { slugifyRoleName } from "../../features/business-staff/schemas";
import {
	createRoleForAdminFn,
	deleteRoleForAdminFn,
	getRolePermissionsForAdminFn,
	getRolesForAdminFn,
	saveRolePermissionsForAdminFn,
} from "../../features/business-staff/staff.server-fns";
import type { BusinessRoleRow } from "../../features/business-staff/types";

export const Route = createFileRoute("/admin/roles")({
	beforeLoad: async ({ location }) => {
		await requireBusinessPermissionForRoute("roles.view", location.href);
	},
	loader: async () => {
		const payload = await getRolesForAdminFn();
		return normalizeRolesPageData(payload);
	},
	component: AdminRolesPage,
});

function PermissionMatrix(props: {
	selected: Set<BusinessPermissionKey>;
	onToggle: (key: BusinessPermissionKey) => void;
}) {
	return (
		<div className="overflow-x-auto rounded-2xl border">
			<table className="w-full min-w-[720px] text-sm">
				<thead>
					<tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
						<th className="px-4 py-3">Módulo</th>
						{BUSINESS_PERMISSION_ACTIONS.map((action) => (
							<th key={action} className="px-3 py-3 text-center">
								{PERMISSION_ACTION_LABELS[action]}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{BUSINESS_PERMISSION_MODULES.map((module) => (
						<tr key={module} className="border-b last:border-0">
							<td className="px-4 py-3 font-medium">
								{PERMISSION_MODULE_LABELS[module]}
							</td>
							{BUSINESS_PERMISSION_ACTIONS.map((action) => {
								const key = buildPermissionKey(module, action);
								const checked = props.selected.has(key);
								return (
									<td key={key} className="px-3 py-3 text-center">
										<input
											type="checkbox"
											checked={checked}
											onChange={() => props.onToggle(key)}
											aria-label={`${PERMISSION_MODULE_LABELS[module]} ${PERMISSION_ACTION_LABELS[action]}`}
										/>
									</td>
								);
							})}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function AdminRolesPage() {
	const loaderData = Route.useLoaderData();
	const rolesList = loaderData.roles;
	const owner = loaderData.owner;
	const router = useRouter();
	const [editingRole, setEditingRole] = useState<BusinessRoleRow | null>(null);
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [isPermsOpen, setIsPermsOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [roleName, setRoleName] = useState("");
	const [roleDescription, setRoleDescription] = useState("");
	const [roleSlug, setRoleSlug] = useState("");
	const [permissionSet, setPermissionSet] = useState<
		Set<BusinessPermissionKey>
	>(new Set());

	const customRoles = useMemo(
		() => rolesList.filter((role) => role.slug !== "owner"),
		[rolesList],
	);

	function openCreate() {
		setRoleName("");
		setRoleDescription("");
		setRoleSlug("");
		setIsCreateOpen(true);
	}

	async function openPermissions(role: BusinessRoleRow) {
		setEditingRole(role);
		const data = await getRolePermissionsForAdminFn({ data: { id: role.id } });
		setPermissionSet(new Set(data.permission_keys));
		setIsPermsOpen(true);
	}

	function togglePermission(key: BusinessPermissionKey) {
		setPermissionSet((prev) => {
			const next = new Set(prev);
			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}
			return next;
		});
	}

	async function handleCreateRole(e: React.FormEvent) {
		e.preventDefault();
		setIsSubmitting(true);
		try {
			await createRoleForAdminFn({
				data: {
					name: roleName,
					description: roleDescription,
					slug: roleSlug || slugifyRoleName(roleName),
				},
			});
			setIsCreateOpen(false);
			await router.invalidate();
		} catch (error) {
			window.alert(error instanceof Error ? error.message : "Error al crear.");
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handleSavePermissions() {
		if (!editingRole) return;
		setIsSubmitting(true);
		try {
			await saveRolePermissionsForAdminFn({
				data: {
					role_id: editingRole.id,
					permission_keys: [...permissionSet],
				},
			});
			setIsPermsOpen(false);
			setEditingRole(null);
		} catch (error) {
			window.alert(
				error instanceof Error ? error.message : "Error al guardar.",
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handleDeleteRole(role: BusinessRoleRow) {
		if (!window.confirm(`¿Eliminar el rol "${role.name}"?`)) return;
		try {
			await deleteRoleForAdminFn({ data: { id: role.id } });
			await router.invalidate();
		} catch (error) {
			window.alert(
				error instanceof Error ? error.message : "No se pudo eliminar.",
			);
		}
	}

	return (
		<>
			<AdminShell
				title="Roles y permisos"
				description="Define qué módulos del TPV puede ver o gestionar cada rol."
				actions={
					<button
						type="button"
						onClick={openCreate}
						className="inline-flex items-center gap-2 rounded-2xl border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
					>
						<PlusCircle className="h-4 w-4" />
						Nuevo rol
					</button>
				}
			>
				<div className="overflow-hidden rounded-3xl border bg-background">
					<div className="grid grid-cols-[1.4fr_2fr_120px_160px] gap-4 border-b px-5 py-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">
						<span>Rol</span>
						<span>Descripción</span>
						<span>Empleados</span>
						<span>Acciones</span>
					</div>
					<div className="divide-y">
						<div className="grid grid-cols-[1.4fr_2fr_120px_160px] gap-4 bg-muted/15 px-5 py-4 text-sm">
							<div>
								<div className="flex flex-wrap items-center gap-2">
									<p className="font-semibold">{owner.name}</p>
									<span className="rounded-full border bg-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
										Sistema
									</span>
								</div>
								<p className="text-xs text-muted-foreground">{owner.slug}</p>
							</div>
							<div>
								<p className="text-muted-foreground">{owner.description}</p>
								<p className="mt-1 text-xs font-medium text-primary">
									Acceso total automático
								</p>
							</div>
							<p className="tabular-nums">{owner.member_count}</p>
							<p className="text-xs text-muted-foreground">No editable</p>
						</div>

						{customRoles.map((role) => (
							<div
								key={role.id}
								className="grid grid-cols-[1.4fr_2fr_120px_160px] gap-4 px-5 py-4 text-sm"
							>
								<div>
									<p className="font-semibold">{role.name}</p>
									<p className="text-xs text-muted-foreground">{role.slug}</p>
								</div>
								<p className="text-muted-foreground">
									{role.description || "—"}
								</p>
								<p className="tabular-nums">{role.member_count}</p>
								<div className="flex gap-2">
									<button
										type="button"
										onClick={() => openPermissions(role)}
										className="rounded-xl border p-2 hover:bg-muted"
										title="Permisos"
									>
										<Shield className="h-4 w-4" />
									</button>
									<button
										type="button"
										onClick={() => handleDeleteRole(role)}
										disabled={role.member_count > 0}
										className="rounded-xl border p-2 text-red-600 hover:bg-red-50 disabled:opacity-40"
										title="Eliminar"
									>
										<Trash2 className="h-4 w-4" />
									</button>
								</div>
							</div>
						))}
					</div>
				</div>
			</AdminShell>

			{isCreateOpen ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-2xl">
						<div className="mb-4 flex items-center justify-between">
							<h2 className="text-xl font-semibold">Nuevo rol</h2>
							<button type="button" onClick={() => setIsCreateOpen(false)}>
								<X className="h-4 w-4" />
							</button>
						</div>
						<form onSubmit={handleCreateRole} className="space-y-4">
							<input
								className="w-full rounded-2xl border px-4 py-3 text-sm"
								placeholder="Nombre del rol"
								value={roleName}
								onChange={(e) => {
									setRoleName(e.target.value);
									if (!roleSlug) {
										setRoleSlug(slugifyRoleName(e.target.value));
									}
								}}
								required
							/>
							<input
								className="w-full rounded-2xl border px-4 py-3 text-sm"
								placeholder="Slug (opcional)"
								value={roleSlug}
								onChange={(e) => setRoleSlug(e.target.value)}
							/>
							<textarea
								className="w-full rounded-2xl border px-4 py-3 text-sm"
								placeholder="Descripción"
								rows={3}
								value={roleDescription}
								onChange={(e) => setRoleDescription(e.target.value)}
							/>
							<button
								type="submit"
								disabled={isSubmitting}
								className="w-full rounded-2xl border border-primary bg-primary py-2 text-sm text-primary-foreground"
							>
								{isSubmitting ? "Creando..." : "Crear rol"}
							</button>
						</form>
					</div>
				</div>
			) : null}

			{isPermsOpen && editingRole ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border bg-card p-6 shadow-2xl">
						<div className="mb-4 flex items-center justify-between">
							<div>
								<h2 className="text-xl font-semibold">
									Permisos: {editingRole.name}
								</h2>
								<p className="text-sm text-muted-foreground">
									{editingRole.slug}
								</p>
							</div>
							<button
								type="button"
								onClick={() => {
									setIsPermsOpen(false);
									setEditingRole(null);
								}}
							>
								<X className="h-4 w-4" />
							</button>
						</div>
						<PermissionMatrix
							selected={permissionSet}
							onToggle={togglePermission}
						/>
						<div className="mt-4 flex justify-end gap-3">
							<button
								type="button"
								className="rounded-2xl border px-4 py-2 text-sm"
								onClick={() => setIsPermsOpen(false)}
							>
								Cancelar
							</button>
							<button
								type="button"
								disabled={isSubmitting}
								onClick={handleSavePermissions}
								className="rounded-2xl border border-primary bg-primary px-4 py-2 text-sm text-primary-foreground"
							>
								{isSubmitting ? "Guardando..." : "Guardar permisos"}
							</button>
						</div>
					</div>
				</div>
			) : null}
		</>
	);
}
