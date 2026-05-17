import { createFileRoute, useRouter } from "@tanstack/react-router";
import { PlusCircle } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminShell } from "../../components/layout/admin-shell";
import { getProductsFn } from "../../features/admin/server-fns";
import type { Product } from "../../features/admin/types";
import { requireRoleForRoute } from "../../features/auth/route-guards";
import { CATALOG_MANAGEMENT_ROLES } from "../../features/auth/types";
import { getWarehousesFn } from "../../features/inventory/server-fns";
import type { Warehouse } from "../../features/inventory/types";
import {
	createPurchaseReceiptFn,
	createSupplierFn,
	getRecentPurchaseReceiptsFn,
	getSuppliersFn,
} from "../../features/purchases/server-fns";
import type {
	PurchaseReceiptListItem,
	Supplier,
} from "../../features/purchases/types";

export const Route = createFileRoute("/admin/purchases")({
	beforeLoad: async ({ location }) => {
		await requireRoleForRoute(CATALOG_MANAGEMENT_ROLES, location.href);
	},
	loader: async () => {
		const [suppliers, warehouses, products, receipts] = await Promise.all([
			getSuppliersFn(),
			getWarehousesFn(),
			getProductsFn(),
			getRecentPurchaseReceiptsFn(),
		]);

		return { suppliers, warehouses, products, receipts };
	},
	component: AdminPurchasesPage,
});

function AdminPurchasesPage() {
	const { suppliers, warehouses, products, receipts } = Route.useLoaderData();
	const router = useRouter();

	const [supplierName, setSupplierName] = useState("");
	const [supplierTaxId, setSupplierTaxId] = useState("");
	const [supplierEmail, setSupplierEmail] = useState("");
	const [supplierPhone, setSupplierPhone] = useState("");

	const [selectedSupplierId, setSelectedSupplierId] = useState(
		() => suppliers[0]?.id ?? "",
	);
	const [selectedWarehouseId, setSelectedWarehouseId] = useState(
		() => warehouses.find((warehouse) => warehouse.is_active)?.id ?? "",
	);
	const [selectedProductId, setSelectedProductId] = useState(
		() => products.find((product) => product.is_active)?.id ?? "",
	);
	const [quantity, setQuantity] = useState("1");
	const [unitCost, setUnitCost] = useState("0");
	const [notes, setNotes] = useState("");

	const [isSubmittingSupplier, setIsSubmittingSupplier] = useState(false);
	const [isSubmittingReceipt, setIsSubmittingReceipt] = useState(false);

	const activeProducts = useMemo(
		() => products.filter((product: Product) => product.is_active),
		[products],
	);
	const activeWarehouses = useMemo(
		() => warehouses.filter((warehouse: Warehouse) => warehouse.is_active),
		[warehouses],
	);

	async function handleCreateSupplier() {
		const name = supplierName.trim();
		if (!name) {
			window.alert("Nombre de proveedor obligatorio.");
			return;
		}

		try {
			setIsSubmittingSupplier(true);
			const result = await createSupplierFn({
				data: {
					name,
					tax_id: supplierTaxId.trim(),
					email: supplierEmail.trim(),
					phone: supplierPhone.trim(),
				},
			});
			setSupplierName("");
			setSupplierTaxId("");
			setSupplierEmail("");
			setSupplierPhone("");
			if (result.supplierId) {
				setSelectedSupplierId(result.supplierId);
			}
			await router.invalidate();
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "No se pudo crear el proveedor.";
			window.alert(message);
		} finally {
			setIsSubmittingSupplier(false);
		}
	}

	async function handleCreateReceipt() {
		if (!selectedSupplierId || !selectedWarehouseId || !selectedProductId) {
			window.alert("Completa proveedor, almacén y producto.");
			return;
		}

		const parsedQuantity = Number.parseFloat(quantity);
		const parsedUnitCost = Number.parseFloat(unitCost);
		if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
			window.alert("Cantidad inválida.");
			return;
		}
		if (!Number.isFinite(parsedUnitCost) || parsedUnitCost < 0) {
			window.alert("Coste unitario inválido.");
			return;
		}

		try {
			setIsSubmittingReceipt(true);
			await createPurchaseReceiptFn({
				data: {
					supplier_id: selectedSupplierId,
					warehouse_id: selectedWarehouseId,
					product_id: selectedProductId,
					quantity: parsedQuantity,
					unit_cost: parsedUnitCost,
					notes: notes.trim(),
				},
			});
			setQuantity("1");
			setUnitCost("0");
			setNotes("");
			await router.invalidate();
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "No se pudo registrar la compra.";
			window.alert(message);
		} finally {
			setIsSubmittingReceipt(false);
		}
	}

	return (
		<AdminShell
			title="Compras a proveedor"
			description="Registra compras y entrada de mercancía con impacto en stock."
		>
			<div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
				<section className="rounded-3xl border bg-background p-5">
					<h2 className="text-lg font-semibold">Nuevo proveedor</h2>
					<div className="mt-4 grid gap-2">
						<input
							type="text"
							value={supplierName}
							onChange={(event) => setSupplierName(event.target.value)}
							placeholder="Nombre proveedor"
							className="rounded-xl border bg-card px-3 py-2 text-sm"
						/>
						<input
							type="text"
							value={supplierTaxId}
							onChange={(event) => setSupplierTaxId(event.target.value)}
							placeholder="NIF/CIF (opcional)"
							className="rounded-xl border bg-card px-3 py-2 text-sm"
						/>
						<input
							type="email"
							value={supplierEmail}
							onChange={(event) => setSupplierEmail(event.target.value)}
							placeholder="Email (opcional)"
							className="rounded-xl border bg-card px-3 py-2 text-sm"
						/>
						<input
							type="text"
							value={supplierPhone}
							onChange={(event) => setSupplierPhone(event.target.value)}
							placeholder="Teléfono (opcional)"
							className="rounded-xl border bg-card px-3 py-2 text-sm"
						/>
						<button
							type="button"
							onClick={handleCreateSupplier}
							disabled={isSubmittingSupplier}
							className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
						>
							<PlusCircle className="h-4 w-4" />
							{isSubmittingSupplier ? "Creando..." : "Crear proveedor"}
						</button>
					</div>
				</section>

				<section className="rounded-3xl border bg-background p-5">
					<h2 className="text-lg font-semibold">Registrar compra</h2>
					<div className="mt-4 grid gap-2">
						<select
							value={selectedSupplierId}
							onChange={(event) => setSelectedSupplierId(event.target.value)}
							className="rounded-xl border bg-card px-3 py-2 text-sm"
						>
							<option value="">Proveedor</option>
							{suppliers.map((supplier: Supplier) => (
								<option key={supplier.id} value={supplier.id}>
									{supplier.name}
								</option>
							))}
						</select>

						<select
							value={selectedWarehouseId}
							onChange={(event) => setSelectedWarehouseId(event.target.value)}
							className="rounded-xl border bg-card px-3 py-2 text-sm"
						>
							<option value="">Almacén</option>
							{activeWarehouses.map((warehouse: Warehouse) => (
								<option key={warehouse.id} value={warehouse.id}>
									{warehouse.name}
								</option>
							))}
						</select>

						<select
							value={selectedProductId}
							onChange={(event) => setSelectedProductId(event.target.value)}
							className="rounded-xl border bg-card px-3 py-2 text-sm"
						>
							<option value="">Producto</option>
							{activeProducts.map((product: Product) => (
								<option key={product.id} value={product.id}>
									{product.name}
								</option>
							))}
						</select>

						<div className="grid grid-cols-2 gap-2">
							<input
								type="number"
								min="0.001"
								step="0.001"
								value={quantity}
								onChange={(event) => setQuantity(event.target.value)}
								placeholder="Cantidad"
								className="rounded-xl border bg-card px-3 py-2 text-sm"
							/>
							<input
								type="number"
								min="0"
								step="0.001"
								value={unitCost}
								onChange={(event) => setUnitCost(event.target.value)}
								placeholder="Coste unitario"
								className="rounded-xl border bg-card px-3 py-2 text-sm"
							/>
						</div>

						<input
							type="text"
							value={notes}
							onChange={(event) => setNotes(event.target.value)}
							placeholder="Notas (opcional)"
							className="rounded-xl border bg-card px-3 py-2 text-sm"
						/>

						<button
							type="button"
							onClick={handleCreateReceipt}
							disabled={isSubmittingReceipt}
							className="rounded-xl border border-primary bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
						>
							{isSubmittingReceipt ? "Guardando..." : "Guardar compra"}
						</button>
					</div>
				</section>
			</div>

			<section className="mt-6 rounded-3xl border bg-background p-5">
				<h2 className="text-lg font-semibold">Últimas compras</h2>
				<div className="mt-3 space-y-2">
					{receipts.length === 0 ? (
						<div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
							Aún no hay compras registradas.
						</div>
					) : (
						receipts.map((receipt: PurchaseReceiptListItem) => (
							<div
								key={receipt.id}
								className="rounded-2xl border px-3 py-2 text-sm"
							>
								<p className="font-medium">
									{receipt.supplier_name} · {receipt.warehouse_name}
								</p>
								<p className="text-muted-foreground">
									Total: {receipt.total_amount.toFixed(2)} ·{" "}
									{new Date(receipt.created_at).toLocaleString()} ·{" "}
									{receipt.created_by_user_name}
								</p>
							</div>
						))
					)}
				</div>
			</section>
		</AdminShell>
	);
}
