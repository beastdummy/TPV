import {
	createFileRoute,
	Outlet,
	useMatchRoute,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { PlusCircle, Search, Trash2 } from "lucide-react";

import { AdminShell } from "../../components/layout/admin-shell";
import {
	deleteProductFn,
	getCategoriesFn,
	getProductsFn,
} from "../../features/admin/server-fns";
import type { Category, Product } from "../../features/admin/types";
import { requireRoleForRoute } from "../../features/auth/route-guards";

export const Route = createFileRoute("/admin/products")({
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
	component: AdminProductsPage,
});

function AdminProductsPage() {
	const navigate = useNavigate();
	const router = useRouter();
	const matchRoute = useMatchRoute();
	const { categories, products } = Route.useLoaderData();

	const isChildRoute = Boolean(matchRoute({ to: "/admin/products/create" }));
	const isEditRoute = Boolean(
		matchRoute({ to: "/admin/products/$productId/edit", fuzzy: true }),
	);

	async function handleDeleteProduct(productId: string) {
		const confirmed = window.confirm(
			"¿Seguro que quieres borrar este producto?",
		);

		if (!confirmed) return;

		try {
			await deleteProductFn({
				data: { id: productId },
			});

			window.alert("Producto borrado correctamente.");
			await router.invalidate();
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "No se ha podido borrar el producto.";
			window.alert(message);
		}
	}

	if (isChildRoute || isEditRoute) {
		return <Outlet />;
	}

	return (
		<AdminShell
			title="Productos"
			description="Gestiona el catálogo del TPV en una vista compacta."
			actions={
				<button
					type="button"
					onClick={() => navigate({ to: "/admin/products/create" })}
					className="relative z-10 inline-flex items-center gap-2 rounded-2xl border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
				>
					<PlusCircle className="h-4 w-4" />
					Nuevo producto
				</button>
			}
		>
			<div className="mb-4 grid gap-4 lg:grid-cols-[1.2fr_260px]">
				<div className="flex items-center gap-3 rounded-2xl border bg-background px-4 py-3">
					<Search className="h-4 w-4 text-muted-foreground" />
					<input
						type="text"
						placeholder="Buscar producto..."
						className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
					/>
				</div>

				<select className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none">
					<option value="">Todas las categorías</option>
					{categories.map((category: Category) => (
						<option key={category.id} value={category.id}>
							{category.name}
						</option>
					))}
				</select>
			</div>

			<div className="overflow-hidden rounded-3xl border bg-background">
				<div className="grid grid-cols-[70px_1.6fr_1fr_120px_90px_120px_90px_110px_90px] gap-3 border-b px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
					<span>Img</span>
					<span>Name</span>
					<span>Category</span>
					<span>Precio</span>
					<span>IVA</span>
					<span>Almacén</span>
					<span>Orden</span>
					<span>Estado</span>
					<span>Acciones</span>
				</div>

				<div className="divide-y">
					{products.map((product: Product) => (
						<button
							key={product.id}
							type="button"
							onClick={() =>
								navigate({
									to: "/admin/products/$productId/edit",
									params: { productId: String(product.id) },
								})
							}
							className="grid w-full grid-cols-[70px_1.6fr_1fr_120px_90px_120px_90px_110px_90px] gap-3 px-4 py-3 text-left text-sm transition hover:bg-muted/40"
						>
							<div className="flex items-center">
								<span className="rounded-lg border px-2 py-1 text-xs text-muted-foreground">
									{product.image_url ? "Sí" : "No"}
								</span>
							</div>

							<div className="min-w-0">
								<p className="truncate font-semibold">{product.name}</p>
								<p className="truncate text-xs text-muted-foreground">
									{product.description}
								</p>
							</div>

							<div className="flex items-center truncate text-muted-foreground">
								{product.category_name}
							</div>

							<div className="flex items-center font-medium tabular-nums">
								{Number(product.price).toFixed(2)} €
							</div>

							<div className="flex items-center tabular-nums">
								{Number(product.tax_rate)}%
							</div>

							<div className="flex items-center truncate text-muted-foreground">
								{product.warehouse}
							</div>

							<div className="flex items-center tabular-nums">
								{product.sort_order}
							</div>

							<div className="flex items-center">
								<span
									className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
										product.is_active
											? "bg-emerald-100 text-emerald-700"
											: "bg-muted text-muted-foreground"
									}`}
								>
									{product.is_active ? "Activo" : "Inactivo"}
								</span>
							</div>

							<div className="flex items-center">
								<button
									type="button"
									onClick={(event) => {
										event.stopPropagation();
										handleDeleteProduct(product.id);
									}}
									className="rounded-xl border bg-background p-2 text-red-600 transition hover:bg-red-50"
									aria-label={`Borrar ${product.name}`}
									title="Borrar"
								>
									<Trash2 className="h-4 w-4" />
								</button>
							</div>
						</button>
					))}
				</div>
			</div>
		</AdminShell>
	);
}
