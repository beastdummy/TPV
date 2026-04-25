import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Save } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminShell } from "../../components/layout/admin-shell";
import {
	getCategoriesFn,
	getProductByIdFn,
	updateProductFn,
} from "../../features/admin/server-fns";
import type { Category } from "../../features/admin/types";
import { requireRoleForRoute } from "../../features/auth/route-guards";

export const Route = createFileRoute("/admin/products/$productId/edit")({
	beforeLoad: async ({ location }) => {
		await requireRoleForRoute(["owner", "admin", "manager"], location.href);
	},
	loader: async ({ params }) => {
		const [categories, product] = await Promise.all([
			getCategoriesFn(),
			getProductByIdFn({
				data: { id: params.productId },
			}),
		]);

		if (!product) {
			throw new Error("Producto no encontrado");
		}

		return { categories, product };
	},
	component: EditProductPage,
});

type ProductFormState = {
	id: string;
	name: string;
	description: string;
	price: number;
	category_id: string;
	image_url: string;
	tax_rate: number;
	warehouse: string;
	sort_order: number;
	is_active: boolean;
};

function EditProductPage() {
	const navigate = useNavigate();
	const { categories, product } = Route.useLoaderData();
	const [isSubmitting, setIsSubmitting] = useState(false);

	const activeCategories = useMemo(
		() => categories.filter((category: Category) => category.is_active),
		[categories],
	);

	const [form, setForm] = useState<ProductFormState>({
		id: product.id,
		name: product.name,
		description: product.description ?? "",
		price: Number(product.price),
		category_id: product.category_id,
		image_url: product.image_url ?? "",
		tax_rate: Number(product.tax_rate),
		warehouse: product.warehouse ?? "Barra",
		sort_order: Number(product.sort_order),
		is_active: Boolean(product.is_active),
	});

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setIsSubmitting(true);

		try {
			await updateProductFn({
				data: form,
			});

			window.alert("Producto actualizado correctamente.");
			await navigate({ to: "/admin/products" });
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "No se ha podido actualizar el producto.";
			window.alert(message);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<AdminShell
			title="Editar producto"
			description={`Modifica los datos de ${product.name}.`}
			actions={
				<button
					type="button"
					onClick={() => navigate({ to: "/admin/products" })}
					className="inline-flex items-center gap-2 rounded-2xl border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted"
				>
					<ArrowLeft className="h-4 w-4" />
					Volver
				</button>
			}
		>
			<form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
				<section className="rounded-3xl border bg-background p-6">
					<div className="mb-5">
						<h2 className="text-lg font-semibold">Información principal</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							Datos principales del producto dentro del catálogo.
						</p>
					</div>

					<div className="grid gap-5 md:grid-cols-2">
						<div className="space-y-2">
							<label htmlFor="product-name" className="text-sm font-medium">
								Nombre
							</label>
							<input
								id="product-name"
								type="text"
								value={form.name}
								onChange={(e) =>
									setForm((prev) => ({ ...prev, name: e.target.value }))
								}
								className="w-full rounded-2xl border bg-card px-4 py-3 text-sm outline-none transition focus:border-primary"
								required
							/>
						</div>

						<div className="space-y-2">
							<label htmlFor="product-category" className="text-sm font-medium">
								Categoría
							</label>
							<select
								id="product-category"
								value={form.category_id}
								onChange={(e) =>
									setForm((prev) => ({ ...prev, category_id: e.target.value }))
								}
								className="w-full rounded-2xl border bg-card px-4 py-3 text-sm outline-none transition focus:border-primary"
								required
							>
								{activeCategories.map((category: Category) => (
									<option key={category.id} value={category.id}>
										{category.name}
									</option>
								))}
							</select>
						</div>
					</div>

					<div className="mt-5 space-y-2">
						<label
							htmlFor="product-description"
							className="text-sm font-medium"
						>
							Descripción
						</label>
						<textarea
							id="product-description"
							value={form.description}
							onChange={(e) =>
								setForm((prev) => ({ ...prev, description: e.target.value }))
							}
							rows={3}
							className="w-full rounded-2xl border bg-card px-4 py-3 text-sm outline-none transition focus:border-primary"
						/>
					</div>
				</section>

				<section className="rounded-3xl border bg-background p-6">
					<div className="mb-5">
						<h2 className="text-lg font-semibold">Precio y gestión</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							Ajusta el precio, IVA, almacén y orden de aparición.
						</p>
					</div>

					<div className="grid gap-5 md:grid-cols-4">
						<div className="space-y-2">
							<label htmlFor="product-price" className="text-sm font-medium">
								Precio
							</label>
							<input
								id="product-price"
								type="number"
								step="0.01"
								min="0"
								value={form.price}
								onChange={(e) =>
									setForm((prev) => ({
										...prev,
										price: Number(e.target.value),
									}))
								}
								className="w-full rounded-2xl border bg-card px-4 py-3 text-sm outline-none transition focus:border-primary"
								required
							/>
						</div>

						<div className="space-y-2">
							<label htmlFor="product-tax" className="text-sm font-medium">
								IVA %
							</label>
							<input
								id="product-tax"
								type="number"
								step="0.01"
								min="0"
								value={form.tax_rate}
								onChange={(e) =>
									setForm((prev) => ({
										...prev,
										tax_rate: Number(e.target.value),
									}))
								}
								className="w-full rounded-2xl border bg-card px-4 py-3 text-sm outline-none transition focus:border-primary"
								required
							/>
						</div>

						<div className="space-y-2">
							<label
								htmlFor="product-warehouse"
								className="text-sm font-medium"
							>
								Almacén
							</label>
							<input
								id="product-warehouse"
								type="text"
								value={form.warehouse}
								onChange={(e) =>
									setForm((prev) => ({ ...prev, warehouse: e.target.value }))
								}
								className="w-full rounded-2xl border bg-card px-4 py-3 text-sm outline-none transition focus:border-primary"
								required
							/>
						</div>

						<div className="space-y-2">
							<label htmlFor="product-order" className="text-sm font-medium">
								Orden
							</label>
							<input
								id="product-order"
								type="number"
								value={form.sort_order}
								onChange={(e) =>
									setForm((prev) => ({
										...prev,
										sort_order: Number(e.target.value),
									}))
								}
								className="w-full rounded-2xl border bg-card px-4 py-3 text-sm outline-none transition focus:border-primary"
								required
							/>
						</div>
					</div>
				</section>

				<section className="rounded-3xl border bg-background p-6">
					<div className="mb-5">
						<h2 className="text-lg font-semibold">Imagen y estado</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							Configura la imagen visible y si el producto estará disponible.
						</p>
					</div>

					<div className="grid gap-5 md:grid-cols-[1fr_220px]">
						<div className="space-y-2">
							<label htmlFor="product-image" className="text-sm font-medium">
								Ruta de imagen
							</label>
							<input
								id="product-image"
								type="text"
								value={form.image_url}
								onChange={(e) =>
									setForm((prev) => ({ ...prev, image_url: e.target.value }))
								}
								placeholder="/images/products/coca-cola.png"
								className="w-full rounded-2xl border bg-card px-4 py-3 text-sm outline-none transition focus:border-primary"
							/>
						</div>

						<div className="space-y-2">
							<p className="text-sm font-medium">Estado</p>
							<div className="flex h-12.5 items-center rounded-2xl border bg-card px-4">
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
									Producto activo
								</label>
							</div>
						</div>
					</div>
				</section>

				<div className="flex items-center justify-end gap-3">
					<button
						type="button"
						onClick={() => navigate({ to: "/admin/products" })}
						className="rounded-2xl border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted"
					>
						Cancelar
					</button>

					<button
						type="submit"
						disabled={isSubmitting}
						className="inline-flex items-center gap-2 rounded-2xl border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
					>
						<Save className="h-4 w-4" />
						{isSubmitting ? "Guardando..." : "Guardar cambios"}
					</button>
				</div>
			</form>
		</AdminShell>
	);
}
