import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AdminShell } from "../../components/layout/admin-shell";
import {
	getReplenishmentPageForAdminFn,
	updateProductStockMinimumsForAdminFn,
} from "../../features/admin/inventory.server-fns";
import { requireCatalogManagementTenantForRoute } from "../../features/auth/route-guards";
import type { ReplenishmentStatus } from "../../features/inventory/stock-movement-types";

export const Route = createFileRoute("/admin/replenishment")({
	beforeLoad: async ({ location }) => {
		await requireCatalogManagementTenantForRoute(location.href);
	},
	loader: async () => await getReplenishmentPageForAdminFn(),
	component: AdminReplenishmentPage,
});

function statusClass(status: ReplenishmentStatus): string {
	switch (status) {
		case "OK":
			return "bg-emerald-100 text-emerald-900";
		case "Bajo":
			return "bg-amber-100 text-amber-900";
		case "Negativo":
			return "bg-orange-100 text-orange-900";
		case "Urgente":
			return "bg-red-100 text-red-900";
		default:
			return "bg-muted text-foreground";
	}
}

function AdminReplenishmentPage() {
	const { warehouses, rows } = Route.useLoaderData();
	const router = useRouter();
	const [warehouseFilter, setWarehouseFilter] = useState("");
	const [feedback, setFeedback] = useState<string | null>(null);

	const filteredRows = useMemo(() => {
		if (!warehouseFilter) {
			return rows;
		}
		return rows.filter((row) => row.warehouse_id === warehouseFilter);
	}, [rows, warehouseFilter]);

	async function handleSaveMinimums(
		productId: string,
		warehouseId: string,
		minimum: string,
		reorder: string,
	) {
		const minimumQuantity = Number.parseFloat(minimum);
		const reorderQuantity = Number.parseFloat(reorder);
		if (
			!Number.isFinite(minimumQuantity) ||
			!Number.isFinite(reorderQuantity) ||
			minimumQuantity < 0 ||
			reorderQuantity < 0
		) {
			window.alert("Mínimos inválidos.");
			return;
		}

		try {
			await updateProductStockMinimumsForAdminFn({
				data: {
					product_id: productId,
					warehouse_id: warehouseId,
					minimum_quantity: minimumQuantity,
					reorder_quantity: reorderQuantity,
				},
			});
			setFeedback("Mínimos actualizados.");
			await router.invalidate();
		} catch (error) {
			window.alert(
				error instanceof Error
					? error.message
					: "No se pudieron guardar los mínimos.",
			);
		}
	}

	return (
		<AdminShell
			title="Listado de reposición"
			description="Productos bajo mínimo o en stock negativo por almacén."
			actions={
				<Link
					to="/admin/inventory"
					className="rounded-xl border px-3 py-2 text-sm hover:bg-muted"
				>
					Inventario
				</Link>
			}
		>
			{feedback ? (
				<p className="mb-4 text-sm text-emerald-700">{feedback}</p>
			) : null}

			<section className="rounded-3xl border bg-background p-5">
				<div className="flex flex-wrap items-center gap-3">
					<label className="text-sm font-medium" htmlFor="warehouse-filter">
						Almacén
					</label>
					<select
						id="warehouse-filter"
						value={warehouseFilter}
						onChange={(event) => setWarehouseFilter(event.target.value)}
						className="rounded-xl border bg-card px-3 py-2 text-sm"
					>
						<option value="">Todos</option>
						{warehouses.map((warehouse) => (
							<option key={warehouse.id} value={warehouse.id}>
								{warehouse.name}
							</option>
						))}
					</select>
				</div>

				<div className="mt-4 overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead>
							<tr className="border-b text-left text-muted-foreground">
								<th className="py-2 pr-3">Producto</th>
								<th className="py-2 pr-3">Almacén</th>
								<th className="py-2 pr-3">Stock</th>
								<th className="py-2 pr-3">Vendido hoy</th>
								<th className="py-2 pr-3">Mínimo</th>
								<th className="py-2 pr-3">Faltante</th>
								<th className="py-2 pr-3">Sugerido</th>
								<th className="py-2 pr-3">Estado</th>
								<th className="py-2">Editar mínimos</th>
							</tr>
						</thead>
						<tbody>
							{filteredRows.map((row) => (
								<ReplenishmentRowEditor
									key={`${row.product_id}:${row.warehouse_id}`}
									row={row}
									onSave={handleSaveMinimums}
									statusClass={statusClass(row.status)}
								/>
							))}
						</tbody>
					</table>
				</div>
			</section>
		</AdminShell>
	);
}

function ReplenishmentRowEditor({
	row,
	onSave,
	statusClass,
}: {
	row: Awaited<
		ReturnType<typeof getReplenishmentPageForAdminFn>
	>["rows"][number];
	onSave: (
		productId: string,
		warehouseId: string,
		minimum: string,
		reorder: string,
	) => Promise<void>;
	statusClass: string;
}) {
	const [minimum, setMinimum] = useState(String(row.minimum_quantity));
	const [reorder, setReorder] = useState(String(row.reorder_quantity));
	const needsReplenishment = row.status !== "OK";

	return (
		<tr className="border-b align-top">
			<td className="py-2 pr-3">
				{row.product_name}
				{needsReplenishment ? (
					<span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">
						Necesita reposición
					</span>
				) : null}
			</td>
			<td className="py-2 pr-3">{row.warehouse_name}</td>
			<td
				className={`py-2 pr-3 font-medium ${
					row.current_quantity < 0 ? "text-red-600" : ""
				}`}
			>
				{row.current_quantity}
			</td>
			<td className="py-2 pr-3">{row.sold_today}</td>
			<td className="py-2 pr-3">{row.minimum_quantity}</td>
			<td className="py-2 pr-3">{row.shortage}</td>
			<td className="py-2 pr-3">{row.suggested_reorder}</td>
			<td className="py-2 pr-3">
				<span className={`rounded-full px-2 py-0.5 text-xs ${statusClass}`}>
					{row.status}
				</span>
			</td>
			<td className="py-2">
				<div className="flex flex-wrap gap-1">
					<input
						type="number"
						min={0}
						value={minimum}
						onChange={(event) => setMinimum(event.target.value)}
						className="w-16 rounded border px-1 py-0.5 text-xs"
						aria-label="Mínimo"
					/>
					<input
						type="number"
						min={0}
						value={reorder}
						onChange={(event) => setReorder(event.target.value)}
						className="w-16 rounded border px-1 py-0.5 text-xs"
						aria-label="Cantidad reorden"
					/>
					<button
						type="button"
						onClick={() =>
							onSave(row.product_id, row.warehouse_id, minimum, reorder)
						}
						className="rounded border px-2 py-0.5 text-xs hover:bg-muted"
					>
						Guardar
					</button>
				</div>
			</td>
		</tr>
	);
}
