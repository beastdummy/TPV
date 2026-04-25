import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Pencil, PlusCircle, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminShell } from "../../components/layout/admin-shell";
import {
	createCategoryFn,
	deleteCategoryFn,
	getCategoriesFn,
	updateCategoryFn,
} from "../../features/admin/server-fns";
import type { Category } from "../../features/admin/types";
import { requireRoleForRoute } from "../../features/auth/route-guards";

export const Route = createFileRoute("/admin/categories")({
	beforeLoad: async ({ location }) => {
		await requireRoleForRoute(["owner", "admin", "manager"], location.href);
	},
	loader: async () => {
		const categories = await getCategoriesFn();
		return { categories };
	},
	component: AdminCategoriesPage,
});

type CategoryFormState = {
	id: string;
	name: string;
	description: string;
	sort_order: number;
	is_active: boolean;
};

function slugifyCategoryId(value: string) {
	return value
		.toLowerCase()
		.trim()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function AdminCategoriesPage() {
	const { categories } = Route.useLoaderData();
	const router = useRouter();

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
		null,
	);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const nextSortOrder = useMemo(() => {
		if (!categories.length) return 1;
		return (
			Math.max(...categories.map((category: Category) => category.sort_order)) +
			1
		);
	}, [categories]);

	const [form, setForm] = useState<CategoryFormState>({
		id: "",
		name: "",
		description: "",
		sort_order: nextSortOrder,
		is_active: true,
	});

	function resetForm() {
		setForm({
			id: "",
			name: "",
			description: "",
			sort_order: nextSortOrder,
			is_active: true,
		});
	}

	function openCreateModal() {
		setEditingCategoryId(null);
		resetForm();
		setIsModalOpen(true);
	}

	function openEditModal(category: Category) {
		setEditingCategoryId(category.id);
		setForm({
			id: category.id,
			name: category.name,
			description: category.description,
			sort_order: category.sort_order,
			is_active: category.is_active,
		});
		setIsModalOpen(true);
	}

	function closeModal() {
		setIsModalOpen(false);
		setEditingCategoryId(null);
		setIsSubmitting(false);
	}

	function handleNameChange(value: string) {
		setForm((prev) => ({
			...prev,
			name: value,
			id: editingCategoryId
				? prev.id
				: prev.id
					? prev.id
					: slugifyCategoryId(value),
		}));
	}

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setIsSubmitting(true);

		try {
			if (editingCategoryId) {
				await updateCategoryFn({
					data: form,
				});
				window.alert("Categoría actualizada correctamente.");
			} else {
				await createCategoryFn({
					data: form,
				});
				window.alert("Categoría creada correctamente.");
			}

			closeModal();
			await router.invalidate();
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Ha ocurrido un error al guardar.";
			window.alert(message);
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handleDeleteCategory(categoryId: string) {
		const confirmed = window.confirm(
			"¿Seguro que quieres borrar esta categoría? Solo se borrará si está vacía de productos.",
		);

		if (!confirmed) return;

		try {
			await deleteCategoryFn({
				data: { id: categoryId },
			});

			window.alert("Categoría borrada correctamente.");
			await router.invalidate();
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "No se ha podido borrar la categoría.";
			window.alert(message);
		}
	}

	return (
		<>
			<AdminShell
				title="Categorías"
				description="Define las familias visibles en el TPV y el orden en que aparecen."
				actions={
					<button
						type="button"
						onClick={openCreateModal}
						className="inline-flex items-center gap-2 rounded-2xl border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
					>
						<PlusCircle className="h-4 w-4" />
						Nueva categoría
					</button>
				}
			>
				<div className="overflow-hidden rounded-3xl border bg-background">
					<div className="grid grid-cols-[1.2fr_2fr_120px_120px_120px] gap-4 border-b px-5 py-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">
						<span>Nombre</span>
						<span>Descripción</span>
						<span>Orden</span>
						<span>Estado</span>
						<span>Acciones</span>
					</div>

					<div className="divide-y">
						{categories.map((category: Category) => (
							<div
								key={category.id}
								className="grid grid-cols-[1.2fr_2fr_120px_120px_120px] gap-4 px-5 py-4 text-sm"
							>
								<div>
									<p className="font-semibold">{category.name}</p>
									<p className="mt-1 text-xs text-muted-foreground">
										{category.id}
									</p>
								</div>

								<div className="text-muted-foreground">
									{category.description}
								</div>

								<div className="tabular-nums">{category.sort_order}</div>

								<div>
									<span
										className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
											category.is_active
												? "bg-emerald-100 text-emerald-700"
												: "bg-muted text-muted-foreground"
										}`}
									>
										{category.is_active ? "Activa" : "Inactiva"}
									</span>
								</div>

								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={() => openEditModal(category)}
										className="rounded-xl border bg-background p-2 transition hover:bg-muted"
										aria-label={`Editar ${category.name}`}
										title="Editar"
									>
										<Pencil className="h-4 w-4" />
									</button>

									<button
										type="button"
										onClick={() => handleDeleteCategory(category.id)}
										className="rounded-xl border bg-background p-2 text-red-600 transition hover:bg-red-50"
										aria-label={`Borrar ${category.name}`}
										title="Borrar"
									>
										<Trash2 className="h-4 w-4" />
									</button>
								</div>
							</div>
						))}
					</div>
				</div>
			</AdminShell>

			{isModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className="w-full max-w-2xl rounded-3xl border bg-card shadow-2xl">
						<div className="flex items-start justify-between border-b px-6 py-5">
							<div>
								<p className="text-sm text-muted-foreground">Administración</p>
								<h2 className="text-2xl font-semibold">
									{editingCategoryId ? "Editar categoría" : "Nueva categoría"}
								</h2>
								<p className="mt-2 text-sm text-muted-foreground">
									{editingCategoryId
										? "Modifica los datos de la familia seleccionada."
										: "Crea una familia nueva para organizar el catálogo del TPV."}
								</p>
							</div>

							<button
								type="button"
								onClick={closeModal}
								className="rounded-2xl border bg-background p-2 transition hover:bg-muted"
								aria-label="Cerrar modal"
							>
								<X className="h-4 w-4" />
							</button>
						</div>

						<form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
							<div className="grid gap-5 md:grid-cols-2">
								<div className="space-y-2">
									<label
										htmlFor="category-name"
										className="text-sm font-medium"
									>
										Nombre
									</label>
									<input
										id="category-name"
										type="text"
										value={form.name}
										onChange={(e) => handleNameChange(e.target.value)}
										placeholder="Ej. Refrescos"
										className="w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
										required
									/>
								</div>

								<div className="space-y-2">
									<label htmlFor="category-id" className="text-sm font-medium">
										ID técnico
									</label>
									<input
										id="category-id"
										type="text"
										value={form.id}
										onChange={(e) =>
											setForm((prev) => ({
												...prev,
												id: slugifyCategoryId(e.target.value),
											}))
										}
										placeholder="Ej. soft-drinks"
										className="w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
										required
										disabled={Boolean(editingCategoryId)}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<label
									htmlFor="category-description"
									className="text-sm font-medium"
								>
									Descripción
								</label>
								<textarea
									id="category-description"
									value={form.description}
									onChange={(e) =>
										setForm((prev) => ({
											...prev,
											description: e.target.value,
										}))
									}
									placeholder="Describe brevemente esta categoría"
									rows={3}
									className="w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
								/>
							</div>

							<div className="grid gap-5 md:grid-cols-2">
								<div className="space-y-2">
									<label
										htmlFor="category-order"
										className="text-sm font-medium"
									>
										Orden
									</label>
									<input
										id="category-order"
										type="number"
										value={form.sort_order}
										onChange={(e) =>
											setForm((prev) => ({
												...prev,
												sort_order: Number(e.target.value),
											}))
										}
										className="w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
										required
									/>
								</div>

								<div className="space-y-2">
									<p className="text-sm font-medium">Estado</p>
									<div className="flex h-12.5 items-center rounded-2xl border bg-background px-4">
										<label className="flex items-center gap-3 text-sm">
											<input
												type="checkbox"
												checked={form.is_active}
												onChange={(e) =>
													setForm((prev) => ({
														...prev,
														is_active: e.target.checked,
													}))
												}
											/>
											Activa
										</label>
									</div>
								</div>
							</div>

							<div className="flex items-center justify-end gap-3 border-t pt-5">
								<button
									type="button"
									onClick={closeModal}
									className="rounded-2xl border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted"
								>
									Cancelar
								</button>

								<button
									type="submit"
									disabled={isSubmitting}
									className="rounded-2xl border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
								>
									{isSubmitting
										? "Guardando..."
										: editingCategoryId
											? "Guardar cambios"
											: "Guardar categoría"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</>
	);
}
