import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Download, Mail, Printer, Sheet } from "lucide-react";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";

import { AdminShell } from "../../components/layout/admin-shell";
import {
	adjustStockForAdminFn,
	createInventoryMovementDetailedForAdminFn,
	getInventoryPageForAdminFn,
	transferStockBetweenWarehousesForAdminFn,
} from "../../features/admin/inventory.server-fns";
import { requireCatalogManagementTenantForRoute } from "../../features/auth/route-guards";
import {
	STOCK_ADJUSTMENT_REASON_CODES,
	type StockAdjustmentReasonCode,
} from "../../features/inventory/stock-movement-types";
import {
	LEGACY_STOCK_MOVEMENT_TYPES,
	type LegacyStockMovementType,
} from "../../features/inventory/types";

export const Route = createFileRoute("/admin/inventory")({
	beforeLoad: async ({ location }) => {
		await requireCatalogManagementTenantForRoute(location.href);
	},
	loader: async () => {
		return await getInventoryPageForAdminFn();
	},
	component: AdminInventoryPage,
});

function AdminInventoryPage() {
	const router = useRouter();
	const { warehouses, products, inventoryRows, stockRows, stockMovements } =
		Route.useLoaderData();

	const [warehouseId, setWarehouseId] = useState<string>(
		warehouses[0]?.id ?? "",
	);
	const [productId, setProductId] = useState<string>(products[0]?.id ?? "");
	const [movementType, setMovementType] =
		useState<LegacyStockMovementType>("in");
	const [transferFromId, setTransferFromId] = useState(warehouses[0]?.id ?? "");
	const [transferToId, setTransferToId] = useState(warehouses[1]?.id ?? "");
	const [transferProductId, setTransferProductId] = useState(
		products[0]?.id ?? "",
	);
	const [transferQty, setTransferQty] = useState("1");
	const [transferReason, setTransferReason] = useState("");
	const [adjustProductId, setAdjustProductId] = useState(products[0]?.id ?? "");
	const [adjustWarehouseId, setAdjustWarehouseId] = useState(
		warehouses[0]?.id ?? "",
	);
	const [adjustType, setAdjustType] = useState<"increase" | "decrease" | "set">(
		"decrease",
	);
	const [adjustQty, setAdjustQty] = useState("1");
	const [adjustReasonCode, setAdjustReasonCode] =
		useState<StockAdjustmentReasonCode>("breakage");
	const [adjustNote, setAdjustNote] = useState("");
	const [confirmNegative, setConfirmNegative] = useState(false);
	const [quantity, setQuantity] = useState("1");
	const [lotCode, setLotCode] = useState("");
	const [serialNumber, setSerialNumber] = useState("");
	const [expiryDate, setExpiryDate] = useState("");
	const [reason, setReason] = useState("");
	const [feedback, setFeedback] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [filterWarehouseId, setFilterWarehouseId] = useState<string>("");
	const [showLowStockOnly, setShowLowStockOnly] = useState(false);
	const [lowStockThreshold, setLowStockThreshold] = useState("5");
	const [showExpiringOnly, setShowExpiringOnly] = useState(false);
	const [expiryWithinDays, setExpiryWithinDays] = useState("30");

	const filteredInventoryRows = useMemo(() => {
		const threshold = Number.parseFloat(lowStockThreshold);
		const validThreshold =
			Number.isFinite(threshold) && threshold >= 0 ? threshold : 0;
		const withinDays = Number.parseInt(expiryWithinDays, 10);
		const validWithinDays =
			Number.isFinite(withinDays) && withinDays >= 0 ? withinDays : 0;
		const today = new Date();
		const limitDate = new Date(today);
		limitDate.setDate(today.getDate() + validWithinDays);

		return inventoryRows.filter((row) => {
			if (filterWarehouseId && row.warehouse_id !== filterWarehouseId) {
				return false;
			}

			if (showLowStockOnly && row.qty_on_hand > validThreshold) {
				return false;
			}

			if (showExpiringOnly) {
				if (!row.expiry_date) {
					return false;
				}

				const rowDate = new Date(row.expiry_date);
				if (Number.isNaN(rowDate.getTime())) {
					return false;
				}

				if (rowDate < today || rowDate > limitDate) {
					return false;
				}
			}

			return true;
		});
	}, [
		inventoryRows,
		filterWarehouseId,
		showLowStockOnly,
		lowStockThreshold,
		showExpiringOnly,
		expiryWithinDays,
	]);

	async function handleRegisterMovement() {
		const parsedQuantity = Number.parseFloat(quantity);
		if (!warehouseId || !productId) {
			window.alert("Selecciona almacén y producto.");
			return;
		}

		if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
			window.alert("Cantidad inválida.");
			return;
		}

		try {
			setIsSubmitting(true);
			await createInventoryMovementDetailedForAdminFn({
				data: {
					product_id: productId,
					warehouse_id: warehouseId,
					movement_type: movementType,
					quantity: parsedQuantity,
					lot_code: lotCode.trim(),
					serial_number: serialNumber.trim(),
					expiry_date: expiryDate,
					reason: reason.trim(),
				},
			});
			setFeedback("Movimiento registrado en inventario.");
			setQuantity("1");
			await router.invalidate();
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "No se pudo registrar el movimiento detallado.";
			window.alert(message);
		} finally {
			setIsSubmitting(false);
		}
	}

	function exportCsv() {
		const headers = [
			"Producto",
			"Categoria",
			"Almacen",
			"Lote",
			"Serie",
			"Caducidad",
			"Stock",
		];
		const rows = filteredInventoryRows.map((row) => [
			row.product_name,
			row.category_name,
			row.warehouse_name,
			row.lot_code,
			row.serial_number,
			row.expiry_date ?? "",
			String(row.qty_on_hand),
		]);

		const csv = [headers, ...rows]
			.map((line) =>
				line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
			)
			.join("\n");

		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = "inventario.csv";
		link.click();
		URL.revokeObjectURL(url);
	}

	function exportXlsx() {
		const rows = filteredInventoryRows.map((row) => ({
			Producto: row.product_name,
			Categoria: row.category_name,
			Almacen: row.warehouse_name,
			Lote: row.lot_code,
			Serie: row.serial_number,
			Caducidad: row.expiry_date ?? "",
			Stock: row.qty_on_hand,
		}));

		const workbook = XLSX.utils.book_new();
		const worksheet = XLSX.utils.json_to_sheet(rows);
		XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");
		XLSX.writeFile(workbook, "inventario.xlsx");
	}

	function sendInventoryEmailSummary() {
		const totalRows = filteredInventoryRows.length;
		const totalStock = filteredInventoryRows.reduce(
			(acc, row) => acc + row.qty_on_hand,
			0,
		);
		const body = [
			"Resumen de inventario",
			"",
			`Registros filtrados: ${totalRows}`,
			`Stock total filtrado: ${totalStock}`,
			"",
			"Top 20 registros:",
			...filteredInventoryRows.slice(0, 20).map((row) => {
				return `- ${row.product_name} | ${row.warehouse_name} | Stock: ${row.qty_on_hand} | Cad.: ${
					row.expiry_date ?? "-"
				}`;
			}),
		].join("\n");

		const subject = `Informe de inventario (${new Date().toLocaleDateString("es-ES")})`;
		window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
	}

	return (
		<AdminShell
			title="Inventario detallado"
			description="Control por lote, serie y caducidad con movimientos de entrada/salida."
			actions={
				<>
					<button
						type="button"
						onClick={exportCsv}
						className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition hover:bg-muted"
					>
						<Download className="h-4 w-4" />
						CSV
					</button>
					<button
						type="button"
						onClick={exportXlsx}
						className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition hover:bg-muted"
					>
						<Sheet className="h-4 w-4" />
						XLSX
					</button>
					<button
						type="button"
						onClick={sendInventoryEmailSummary}
						className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition hover:bg-muted"
					>
						<Mail className="h-4 w-4" />
						Email
					</button>
					<button
						type="button"
						onClick={() => window.print()}
						className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition hover:bg-muted"
					>
						<Printer className="h-4 w-4" />
						Imprimir
					</button>
				</>
			}
		>
			<section className="rounded-3xl border bg-background p-5">
				<h2 className="text-lg font-semibold">
					Registrar movimiento detallado
				</h2>
				{feedback ? (
					<p className="mt-2 text-xs text-emerald-700">{feedback}</p>
				) : null}
				<div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
					<select
						value={warehouseId}
						onChange={(event) => setWarehouseId(event.target.value)}
						className="rounded-xl border bg-card px-3 py-2 text-sm"
					>
						<option value="">Almacén</option>
						{warehouses.map((warehouse) => (
							<option key={warehouse.id} value={warehouse.id}>
								{warehouse.name}
							</option>
						))}
					</select>

					<select
						value={productId}
						onChange={(event) => setProductId(event.target.value)}
						className="rounded-xl border bg-card px-3 py-2 text-sm"
					>
						<option value="">Producto</option>
						{products.map((product) => (
							<option key={product.id} value={product.id}>
								{product.name}
							</option>
						))}
					</select>

					<select
						value={movementType}
						onChange={(event) =>
							setMovementType(event.target.value as LegacyStockMovementType)
						}
						className="rounded-xl border bg-card px-3 py-2 text-sm"
					>
						{LEGACY_STOCK_MOVEMENT_TYPES.map((type) => (
							<option key={type} value={type}>
								{type === "in"
									? "Entrada"
									: type === "out"
										? "Salida"
										: "Ajuste"}
							</option>
						))}
					</select>

					<input
						type="number"
						min="0.001"
						step="0.001"
						value={quantity}
						onChange={(event) => setQuantity(event.target.value)}
						className="rounded-xl border bg-card px-3 py-2 text-sm"
						placeholder="Cantidad"
					/>

					<input
						type="text"
						value={lotCode}
						onChange={(event) => setLotCode(event.target.value)}
						className="rounded-xl border bg-card px-3 py-2 text-sm"
						placeholder="Lote"
					/>

					<input
						type="text"
						value={serialNumber}
						onChange={(event) => setSerialNumber(event.target.value)}
						className="rounded-xl border bg-card px-3 py-2 text-sm"
						placeholder="Nº serie"
					/>

					<input
						type="date"
						value={expiryDate}
						onChange={(event) => setExpiryDate(event.target.value)}
						className="rounded-xl border bg-card px-3 py-2 text-sm"
					/>

					<input
						type="text"
						value={reason}
						onChange={(event) => setReason(event.target.value)}
						className="rounded-xl border bg-card px-3 py-2 text-sm"
						placeholder="Motivo"
					/>
				</div>

				<div className="mt-3">
					<button
						type="button"
						onClick={handleRegisterMovement}
						disabled={isSubmitting}
						className="rounded-xl border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
					>
						{isSubmitting ? "Guardando..." : "Registrar movimiento"}
					</button>
				</div>
			</section>

			<section className="mt-6 overflow-hidden rounded-3xl border bg-background">
				<div className="grid gap-2 border-b px-4 py-3 md:grid-cols-2 xl:grid-cols-5">
					<select
						value={filterWarehouseId}
						onChange={(event) => setFilterWarehouseId(event.target.value)}
						className="rounded-xl border bg-card px-3 py-2 text-sm"
					>
						<option value="">Todos los almacenes</option>
						{warehouses.map((warehouse) => (
							<option key={warehouse.id} value={warehouse.id}>
								{warehouse.name}
							</option>
						))}
					</select>
					<label className="inline-flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm">
						<input
							type="checkbox"
							checked={showLowStockOnly}
							onChange={(event) => setShowLowStockOnly(event.target.checked)}
						/>
						Stock bajo
					</label>
					<input
						type="number"
						min="0"
						step="0.001"
						value={lowStockThreshold}
						onChange={(event) => setLowStockThreshold(event.target.value)}
						className="rounded-xl border bg-card px-3 py-2 text-sm"
						placeholder="Umbral stock"
					/>
					<label className="inline-flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm">
						<input
							type="checkbox"
							checked={showExpiringOnly}
							onChange={(event) => setShowExpiringOnly(event.target.checked)}
						/>
						Caduca pronto
					</label>
					<input
						type="number"
						min="0"
						step="1"
						value={expiryWithinDays}
						onChange={(event) => setExpiryWithinDays(event.target.value)}
						className="rounded-xl border bg-card px-3 py-2 text-sm"
						placeholder="Dias para caducar"
					/>
				</div>
				<div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_120px] gap-3 border-b px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
					<span>Producto</span>
					<span>Categoría</span>
					<span>Almacén</span>
					<span>Lote</span>
					<span>Nº serie</span>
					<span>Caducidad</span>
					<span>Stock</span>
				</div>
				<div className="divide-y">
					{filteredInventoryRows.map((row) => (
						<div
							key={row.id}
							className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_120px] gap-3 px-4 py-3 text-sm"
						>
							<span className="truncate font-medium">{row.product_name}</span>
							<span className="truncate text-muted-foreground">
								{row.category_name}
							</span>
							<span className="truncate text-muted-foreground">
								{row.warehouse_name}
							</span>
							<span className="truncate">{row.lot_code || "-"}</span>
							<span className="truncate">{row.serial_number || "-"}</span>
							<span className="truncate">{row.expiry_date ?? "-"}</span>
							<span className="tabular-nums">{row.qty_on_hand}</span>
						</div>
					))}
				</div>
			</section>

			<section className="mt-6 rounded-3xl border bg-background p-5">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<h2 className="text-lg font-semibold">Stock por almacén</h2>
					<Link
						to="/admin/replenishment"
						className="text-sm text-primary underline"
					>
						Listado de reposición
					</Link>
				</div>
				<div className="mt-3 divide-y">
					{stockRows.slice(0, 40).map((row) => (
						<div
							key={`${row.product_id}:${row.warehouse_id}`}
							className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
						>
							<span>
								{row.product_name} · {row.warehouse_name}
							</span>
							<span
								className={`font-medium tabular-nums ${
									row.quantity < 0 ? "text-red-600" : ""
								}`}
							>
								{row.quantity}
								{row.quantity < 0 || row.quantity < row.minimum_quantity ? (
									<span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">
										Necesita reposición
									</span>
								) : null}
							</span>
						</div>
					))}
				</div>
			</section>

			<section className="mt-6 rounded-3xl border bg-background p-5">
				<h2 className="text-lg font-semibold">Transferir entre almacenes</h2>
				<p className="mt-1 text-xs text-muted-foreground">
					Motivo obligatorio. El origen puede quedar en negativo.
				</p>
				<div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
					<select
						value={transferProductId}
						onChange={(event) => setTransferProductId(event.target.value)}
						className="rounded-xl border bg-card px-3 py-2 text-sm"
					>
						{products.map((product) => (
							<option key={product.id} value={product.id}>
								{product.name}
							</option>
						))}
					</select>
					<select
						value={transferFromId}
						onChange={(event) => setTransferFromId(event.target.value)}
						className="rounded-xl border bg-card px-3 py-2 text-sm"
					>
						{warehouses.map((warehouse) => (
							<option key={warehouse.id} value={warehouse.id}>
								Origen: {warehouse.name}
							</option>
						))}
					</select>
					<select
						value={transferToId}
						onChange={(event) => setTransferToId(event.target.value)}
						className="rounded-xl border bg-card px-3 py-2 text-sm"
					>
						{warehouses.map((warehouse) => (
							<option key={warehouse.id} value={warehouse.id}>
								Destino: {warehouse.name}
							</option>
						))}
					</select>
					<input
						type="number"
						min="0.001"
						step="0.001"
						value={transferQty}
						onChange={(event) => setTransferQty(event.target.value)}
						className="rounded-xl border bg-card px-3 py-2 text-sm"
						placeholder="Cantidad"
					/>
					<input
						type="text"
						value={transferReason}
						onChange={(event) => setTransferReason(event.target.value)}
						className="rounded-xl border bg-card px-3 py-2 text-sm md:col-span-2"
						placeholder="Motivo obligatorio"
					/>
				</div>
				<button
					type="button"
					disabled={isSubmitting}
					onClick={async () => {
						const quantity = Number.parseFloat(transferQty);
						if (!transferReason.trim()) {
							window.alert("El motivo es obligatorio.");
							return;
						}
						try {
							setIsSubmitting(true);
							await transferStockBetweenWarehousesForAdminFn({
								data: {
									product_id: transferProductId,
									from_warehouse_id: transferFromId,
									to_warehouse_id: transferToId,
									quantity,
									reason_code: transferReason.trim(),
								},
							});
							setFeedback("Transferencia registrada.");
							await router.invalidate();
						} catch (error) {
							window.alert(
								error instanceof Error
									? error.message
									: "No se pudo transferir.",
							);
						} finally {
							setIsSubmitting(false);
						}
					}}
					className="mt-3 rounded-xl border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
				>
					Transferir
				</button>
			</section>

			<section className="mt-6 rounded-3xl border bg-background p-5">
				<h2 className="text-lg font-semibold">Ajustar stock</h2>
				<div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
					<select
						value={adjustProductId}
						onChange={(event) => setAdjustProductId(event.target.value)}
						className="rounded-xl border bg-card px-3 py-2 text-sm"
					>
						{products.map((product) => (
							<option key={product.id} value={product.id}>
								{product.name}
							</option>
						))}
					</select>
					<select
						value={adjustWarehouseId}
						onChange={(event) => setAdjustWarehouseId(event.target.value)}
						className="rounded-xl border bg-card px-3 py-2 text-sm"
					>
						{warehouses.map((warehouse) => (
							<option key={warehouse.id} value={warehouse.id}>
								{warehouse.name}
							</option>
						))}
					</select>
					<select
						value={adjustType}
						onChange={(event) =>
							setAdjustType(
								event.target.value as "increase" | "decrease" | "set",
							)
						}
						className="rounded-xl border bg-card px-3 py-2 text-sm"
					>
						<option value="increase">Aumentar</option>
						<option value="decrease">Disminuir</option>
						<option value="set">Fijar cantidad</option>
					</select>
					<input
						type="number"
						step="0.001"
						value={adjustQty}
						onChange={(event) => setAdjustQty(event.target.value)}
						className="rounded-xl border bg-card px-3 py-2 text-sm"
					/>
					<select
						value={adjustReasonCode}
						onChange={(event) =>
							setAdjustReasonCode(
								event.target.value as StockAdjustmentReasonCode,
							)
						}
						className="rounded-xl border bg-card px-3 py-2 text-sm"
					>
						{STOCK_ADJUSTMENT_REASON_CODES.map((code) => (
							<option key={code} value={code}>
								{code}
							</option>
						))}
					</select>
					<input
						type="text"
						value={adjustNote}
						onChange={(event) => setAdjustNote(event.target.value)}
						className="rounded-xl border bg-card px-3 py-2 text-sm md:col-span-2"
						placeholder="Nota (obligatoria si motivo = other)"
					/>
					{adjustType === "set" ? (
						<label className="inline-flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={confirmNegative}
								onChange={(event) => setConfirmNegative(event.target.checked)}
							/>
							Confirmar stock negativo
						</label>
					) : null}
				</div>
				<button
					type="button"
					disabled={isSubmitting}
					onClick={async () => {
						try {
							setIsSubmitting(true);
							await adjustStockForAdminFn({
								data: {
									product_id: adjustProductId,
									warehouse_id: adjustWarehouseId,
									adjustment_type: adjustType,
									quantity: Number.parseFloat(adjustQty),
									reason_code: adjustReasonCode,
									note: adjustNote.trim() || undefined,
									confirm_negative: confirmNegative,
								},
							});
							setFeedback("Ajuste registrado.");
							await router.invalidate();
						} catch (error) {
							window.alert(
								error instanceof Error
									? error.message
									: "No se pudo ajustar el stock.",
							);
						} finally {
							setIsSubmitting(false);
						}
					}}
					className="mt-3 rounded-xl border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
				>
					Registrar ajuste
				</button>
			</section>

			<section className="mt-6 rounded-3xl border bg-background p-5">
				<h2 className="text-lg font-semibold">Historial de movimientos</h2>
				<div className="mt-3 max-h-80 divide-y overflow-y-auto">
					{stockMovements.map((movement) => (
						<div key={movement.id} className="py-2 text-sm">
							<p className="font-medium">
								{movement.product_name} · {movement.movement_type}
							</p>
							<p className="text-xs text-muted-foreground">
								{movement.warehouse_id} · {movement.previous_quantity} →{" "}
								<span
									className={
										movement.new_quantity < 0 ? "text-red-600 font-medium" : ""
									}
								>
									{movement.new_quantity}
								</span>{" "}
								· {movement.reason}
							</p>
						</div>
					))}
				</div>
			</section>
		</AdminShell>
	);
}
