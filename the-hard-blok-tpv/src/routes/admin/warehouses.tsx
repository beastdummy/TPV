import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowRight, PlusCircle } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminShell } from "../../components/layout/admin-shell";
import { requireRoleForRoute } from "../../features/auth/route-guards";
import { CATALOG_MANAGEMENT_ROLES } from "../../features/auth/types";
import {
	createWarehouseFn,
	getInventoryItemsFn,
	getWarehousesFn,
} from "../../features/inventory/server-fns";
import type { Warehouse } from "../../features/inventory/types";

export const Route = createFileRoute("/admin/warehouses")({
	beforeLoad: async ({ location }) => {
		await requireRoleForRoute(CATALOG_MANAGEMENT_ROLES, location.href);
	},
	loader: async () => {
		const [warehouses, inventoryItems] = await Promise.all([
			getWarehousesFn(),
			getInventoryItemsFn(),
		]);

		return { warehouses, inventoryItems };
	},
	component: AdminWarehousesPage,
});

function normalizeWarehouseId(value: string) {
	return value
		.toLowerCase()
		.trim()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function AdminWarehousesPage() {
	const { warehouses, inventoryItems } = Route.useLoaderData();
	const router = useRouter();

	const [newWarehouseName, setNewWarehouseName] = useState("");
	const [isCreatingWarehouse, setIsCreatingWarehouse] = useState(false);

	const summariesByWarehouse = useMemo(() => {
		const grouped = new Map<
			string,
			{
				items: number;
				totalQty: number;
				products: Set<string>;
			}
		>();

		for (const row of inventoryItems) {
			const current = grouped.get(row.warehouse_id) ?? {
				items: 0,
				totalQty: 0,
				products: new Set<string>(),
			};
			current.items += 1;
			current.totalQty += row.qty_on_hand;
			current.products.add(row.product_id);
			grouped.set(row.warehouse_id, current);
		}

		return grouped;
	}, [inventoryItems]);

	async function handleCreateWarehouse() {
		const normalizedName = newWarehouseName.trim();
		if (!normalizedName) {
			window.alert("Escribe un nombre de almacén.");
			return;
		}

		const normalizedId = normalizeWarehouseId(normalizedName);
		if (!normalizedId) {
			window.alert("El nombre no genera un ID válido.");
			return;
		}

		try {
			setIsCreatingWarehouse(true);
			await createWarehouseFn({
				data: {
					id: normalizedId,
					name: normalizedName,
					is_active: true,
				},
			});
			setNewWarehouseName("");
			await router.invalidate();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "No se pudo crear el almacén.";
			window.alert(message);
		} finally {
			setIsCreatingWarehouse(false);
		}
	}

	return (
		<AdminShell
			title="Almacenes"
			description="Maestro de almacenes. El stock detallado se gestiona en Inventario."
		>
			<div className="grid gap-6 lg:grid-cols-[1.2fr_2fr]">
				<section className="rounded-3xl border bg-background p-5">
					<h2 className="text-lg font-semibold">Crear almacén</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Alta de almacenes por ID técnico y nombre visible.
					</p>

					<div className="mt-4 flex gap-2">
						<input
							type="text"
							value={newWarehouseName}
							onChange={(event) => setNewWarehouseName(event.target.value)}
							placeholder="Ej: Almacén principal"
							className="w-full rounded-xl border bg-card px-3 py-2 text-sm"
						/>
						<button
							type="button"
							onClick={handleCreateWarehouse}
							disabled={isCreatingWarehouse}
							className="inline-flex items-center gap-2 rounded-xl border border-primary bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
						>
							<PlusCircle className="h-4 w-4" />
							Crear
						</button>
					</div>

					<div className="mt-6 rounded-2xl border bg-card p-4">
						<h3 className="text-sm font-semibold">Operativa de stock</h3>
						<p className="mt-2 text-sm text-muted-foreground">
							La gestión de stock, lotes, series y caducidad está centralizada
							en la página de inventario.
						</p>
						<Link
							to="/admin/inventory"
							className="mt-3 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition hover:bg-muted"
						>
							Ir a inventario
							<ArrowRight className="h-4 w-4" />
						</Link>
					</div>
				</section>

				<section className="overflow-hidden rounded-3xl border bg-background">
					<div className="grid grid-cols-[1fr_220px_140px_140px] gap-3 border-b px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
						<span>Almacén</span>
						<span>ID</span>
						<span>Productos</span>
						<span>Stock total</span>
					</div>
					<div className="divide-y">
						{warehouses.map((warehouse: Warehouse) => {
							const summary = summariesByWarehouse.get(warehouse.id);
							const totalProducts = summary?.products.size ?? 0;
							const totalQty = summary?.totalQty ?? 0;
							return (
								<div
									key={warehouse.id}
									className="grid grid-cols-[1fr_220px_140px_140px] gap-3 px-4 py-3 text-sm"
								>
									<div className="min-w-0">
										<p className="truncate font-medium">{warehouse.name}</p>
										<p className="text-xs text-muted-foreground">
											{warehouse.is_active ? "Activo" : "Inactivo"}
										</p>
									</div>
									<span className="truncate text-muted-foreground">
										{warehouse.id}
									</span>
									<span className="tabular-nums">{totalProducts}</span>
									<span className="tabular-nums">{totalQty.toFixed(3)}</span>
								</div>
							);
						})}
					</div>
				</section>
			</div>
		</AdminShell>
	);
}
