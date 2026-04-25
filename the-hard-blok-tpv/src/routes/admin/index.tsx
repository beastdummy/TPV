import { createFileRoute, Link } from "@tanstack/react-router";
import { FolderTree, Package, PlusCircle } from "lucide-react";

import { AdminShell } from "../../components/layout/admin-shell";
import {
	getCategoriesFn,
	getProductsFn,
} from "../../features/admin/server-fns";
import type { Category, Product } from "../../features/admin/types";
import { requireRoleForRoute } from "../../features/auth/route-guards";

export const Route = createFileRoute("/admin/")({
	beforeLoad: async ({ location }) => {
		await requireRoleForRoute(["owner", "admin", "manager"], location.href);
	},
	loader: async () => {
		const [categories, products] = await Promise.all([
			getCategoriesFn(),
			getProductsFn(),
		]);

		return { categories, products };
	},
	component: AdminIndexPage,
});

function AdminIndexPage() {
	const { categories, products } = Route.useLoaderData();

	const activeCategories = categories.filter(
		(category: Category) => category.is_active,
	).length;

	const activeProducts = products.filter(
		(product: Product) => product.is_active,
	).length;

	return (
		<AdminShell
			title="Administración"
			description="Centro de control para gestionar el catálogo del TPV."
			actions={
				<Link
					to="/admin/products/create"
					className="inline-flex items-center gap-2 rounded-2xl border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
				>
					<PlusCircle className="h-4 w-4" />
					Nuevo producto
				</Link>
			}
		>
			<div className="grid gap-6 md:grid-cols-3">
				<div className="rounded-3xl border bg-background p-5">
					<p className="text-sm text-muted-foreground">Categorías activas</p>
					<p className="mt-3 text-3xl font-bold">{activeCategories}</p>
				</div>

				<div className="rounded-3xl border bg-background p-5">
					<p className="text-sm text-muted-foreground">Productos activos</p>
					<p className="mt-3 text-3xl font-bold">{activeProducts}</p>
				</div>

				<div className="rounded-3xl border bg-background p-5">
					<p className="text-sm text-muted-foreground">Total catálogo</p>
					<p className="mt-3 text-3xl font-bold">{products.length}</p>
				</div>
			</div>

			<div className="mt-6 grid gap-6 lg:grid-cols-2">
				<Link
					to="/admin/categories"
					className="rounded-3xl border bg-background p-6 transition hover:bg-muted/50"
				>
					<div className="flex items-start gap-4">
						<div className="rounded-2xl border bg-card p-3">
							<FolderTree className="h-5 w-5" />
						</div>

						<div>
							<h2 className="text-lg font-semibold">Gestionar categorías</h2>
							<p className="mt-2 text-sm text-muted-foreground">
								Crea, edita y organiza las familias visibles en ventas.
							</p>
						</div>
					</div>
				</Link>

				<Link
					to="/admin/products"
					className="rounded-3xl border bg-background p-6 transition hover:bg-muted/50"
				>
					<div className="flex items-start gap-4">
						<div className="rounded-2xl border bg-card p-3">
							<Package className="h-5 w-5" />
						</div>

						<div>
							<h2 className="text-lg font-semibold">Gestionar productos</h2>
							<p className="mt-2 text-sm text-muted-foreground">
								Controla precios, categorías, estado activo e imágenes del
								catálogo.
							</p>
						</div>
					</div>
				</Link>
			</div>
		</AdminShell>
	);
}
