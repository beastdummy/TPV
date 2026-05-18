import {
	createFileRoute,
	Link,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import { CheckCircle2, Circle } from "lucide-react";
import { useMemo, useState } from "react";

import { requireRoleForRoute } from "../features/auth/route-guards";
import type { Role } from "../features/auth/types";
import {
	confirmBusinessSetupDetailsFn,
	finishBusinessSetupFn,
	getBusinessSetupStateFn,
	loadSetupWizardContextFn,
	setupCreateCategoryFn,
	setupCreateDefaultSupplierFn,
	setupCreateInitialStockFn,
	setupCreateProductFn,
	setupCreateWarehouseFn,
	setupOpenCashSessionFn,
} from "../features/business-setup/setup.rpc";
import type { SetupStep } from "../features/business-setup/types";
import { SETUP_STEPS } from "../features/business-setup/types";
import { getInventoryItemsFn } from "../features/inventory/server-fns";

const SETUP_ROLES: Role[] = ["owner"];

const STEP_LABELS: Record<SetupStep, string> = {
	confirm_business: "Datos del negocio",
	warehouse: "Almacén principal",
	category: "Familia / categoría",
	product: "Producto",
	initial_stock: "Entrada de stock",
	review_inventory: "Revisar inventario",
	configure_cash: "Configurar caja",
	open_cash: "Abrir caja",
	complete: "Listo para vender",
};

export const Route = createFileRoute("/setup")({
	beforeLoad: async ({ location }) => {
		await requireRoleForRoute(SETUP_ROLES, location.href);
		const setup = await getBusinessSetupStateFn();
		if (setup?.setupCompleted) {
			throw redirect({ to: "/dashboard" });
		}
	},
	loader: async () => {
		const [wizard, inventoryItems] = await Promise.all([
			loadSetupWizardContextFn(),
			getInventoryItemsFn().catch(() => []),
		]);
		return { wizard, inventoryItems };
	},
	component: SetupPage,
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

function slugifyCategoryId(value: string) {
	return normalizeWarehouseId(value) || "categoria";
}

function SetupPage() {
	const { wizard: initialWizard, inventoryItems } = Route.useLoaderData();
	const router = useRouter();
	const [wizard, setWizard] = useState(initialWizard);
	const [error, setError] = useState<string | null>(null);
	const [isBusy, setIsBusy] = useState(false);

	const currentStep = wizard.setup.currentStep;

	const stepIndex = useMemo(
		() => SETUP_STEPS.indexOf(currentStep),
		[currentStep],
	);

	async function refreshWizard() {
		const next = await loadSetupWizardContextFn();
		setWizard(next);
		await router.invalidate();
	}

	async function runStep(action: () => Promise<void>) {
		setError(null);
		setIsBusy(true);
		try {
			await action();
			await refreshWizard();
		} catch (caught) {
			setError(
				caught instanceof Error
					? caught.message
					: "No se pudo completar el paso.",
			);
		} finally {
			setIsBusy(false);
		}
	}

	const [businessForm, setBusinessForm] = useState({
		name: initialWizard.business.name,
		legal_name: initialWizard.business.legal_name,
		timezone: initialWizard.business.timezone,
	});
	const [warehouseName, setWarehouseName] = useState("Almacén principal");
	const [categoryName, setCategoryName] = useState("General");
	const [productForm, setProductForm] = useState({
		name: "",
		price: "1.00",
	});
	const [stockQty, setStockQty] = useState("10");
	const [openingFloat, setOpeningFloat] = useState("0");

	return (
		<div className="min-h-screen bg-muted/30 px-4 py-10">
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-6 lg:flex-row">
				<aside className="lg:w-72">
					<div className="rounded-3xl border bg-card p-5">
						<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
							Configuración inicial
						</p>
						<h1 className="mt-2 text-xl font-semibold">Prepara tu TPV</h1>
						<ol className="mt-6 space-y-3">
							{SETUP_STEPS.filter((s) => s !== "complete").map(
								(step, index) => {
									const done = wizard.setup.completedSteps.includes(step);
									const active = step === currentStep;
									return (
										<li
											key={step}
											className={`flex items-start gap-2 text-sm ${
												active
													? "font-medium text-foreground"
													: "text-muted-foreground"
											}`}
										>
											{done ? (
												<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
											) : (
												<Circle className="mt-0.5 h-4 w-4 shrink-0" />
											)}
											<span>
												{index + 1}. {STEP_LABELS[step]}
											</span>
										</li>
									);
								},
							)}
						</ol>
					</div>
				</aside>

				<main className="min-w-0 flex-1 rounded-3xl border bg-card p-6">
					<p className="text-sm text-muted-foreground">
						Paso {Math.min(stepIndex + 1, 9)} de 9
					</p>
					<h2 className="mt-1 text-2xl font-semibold">
						{STEP_LABELS[currentStep]}
					</h2>

					{error ? (
						<p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
							{error}
						</p>
					) : null}

					<div className="mt-6 space-y-4">
						{currentStep === "confirm_business" ? (
							<>
								<label className="block space-y-1 text-sm">
									<span className="font-medium">Nombre comercial</span>
									<input
										className="w-full rounded-2xl border px-3 py-2"
										value={businessForm.name}
										onChange={(e) =>
											setBusinessForm((f) => ({ ...f, name: e.target.value }))
										}
									/>
								</label>
								<label className="block space-y-1 text-sm">
									<span className="font-medium">Razón social (opcional)</span>
									<input
										className="w-full rounded-2xl border px-3 py-2"
										value={businessForm.legal_name}
										onChange={(e) =>
											setBusinessForm((f) => ({
												...f,
												legal_name: e.target.value,
											}))
										}
									/>
								</label>
								<button
									type="button"
									disabled={isBusy}
									className="rounded-2xl border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
									onClick={() =>
										runStep(async () => {
											await confirmBusinessSetupDetailsFn({
												data: businessForm,
											});
										})
									}
								>
									Confirmar y continuar
								</button>
							</>
						) : null}

						{currentStep === "warehouse" ? (
							<>
								<label className="block space-y-1 text-sm">
									<span className="font-medium">Nombre del almacén</span>
									<input
										className="w-full rounded-2xl border px-3 py-2"
										value={warehouseName}
										onChange={(e) => setWarehouseName(e.target.value)}
									/>
								</label>
								<button
									type="button"
									disabled={isBusy}
									className="rounded-2xl border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
									onClick={() =>
										runStep(async () => {
											const id = normalizeWarehouseId(warehouseName);
											if (!id) throw new Error("Nombre de almacén inválido.");
											await setupCreateWarehouseFn({
												data: { id, name: warehouseName.trim() },
											});
										})
									}
								>
									Crear almacén
								</button>
							</>
						) : null}

						{currentStep === "category" ? (
							<>
								<label className="block space-y-1 text-sm">
									<span className="font-medium">Nombre de la familia</span>
									<input
										className="w-full rounded-2xl border px-3 py-2"
										value={categoryName}
										onChange={(e) => setCategoryName(e.target.value)}
									/>
								</label>
								<button
									type="button"
									disabled={isBusy}
									className="rounded-2xl border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
									onClick={() =>
										runStep(async () => {
											const id = slugifyCategoryId(categoryName);
											await setupCreateCategoryFn({
												data: {
													id,
													name: categoryName.trim(),
													description: "",
													sort_order: 0,
													is_active: true,
												},
											});
										})
									}
								>
									Crear categoría
								</button>
							</>
						) : null}

						{currentStep === "product" ? (
							<>
								<label className="block space-y-1 text-sm">
									<span className="font-medium">Nombre del producto</span>
									<input
										className="w-full rounded-2xl border px-3 py-2"
										value={productForm.name}
										onChange={(e) =>
											setProductForm((f) => ({ ...f, name: e.target.value }))
										}
									/>
								</label>
								<label className="block space-y-1 text-sm">
									<span className="font-medium">Precio (€)</span>
									<input
										className="w-full rounded-2xl border px-3 py-2"
										value={productForm.price}
										onChange={(e) =>
											setProductForm((f) => ({ ...f, price: e.target.value }))
										}
									/>
								</label>
								<button
									type="button"
									disabled={isBusy}
									className="rounded-2xl border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
									onClick={() =>
										runStep(async () => {
											const categoryId = slugifyCategoryId(categoryName);
											const warehouseId =
												normalizeWarehouseId(warehouseName) ||
												"almacen-principal";
											await setupCreateProductFn({
												data: {
													name: productForm.name.trim(),
													description: "",
													price: Number.parseFloat(productForm.price) || 0,
													category_id: categoryId,
													image_url: "",
													tax_rate: 10,
													warehouse: warehouseId,
													sort_order: 0,
												},
											});
										})
									}
								>
									Crear producto
								</button>
							</>
						) : null}

						{currentStep === "initial_stock" ? (
							<>
								<p className="text-sm text-muted-foreground">
									Registra la primera entrada de stock con una compra inicial.
								</p>
								<label className="block space-y-1 text-sm">
									<span className="font-medium">Cantidad inicial</span>
									<input
										className="w-full rounded-2xl border px-3 py-2"
										value={stockQty}
										onChange={(e) => setStockQty(e.target.value)}
									/>
								</label>
								<button
									type="button"
									disabled={isBusy}
									className="rounded-2xl border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
									onClick={() =>
										runStep(async () => {
											const supplier = await setupCreateDefaultSupplierFn({
												data: { name: "Proveedor inicial" },
											});
											const qty = Number.parseFloat(stockQty) || 0;
											if (qty <= 0) {
												throw new Error("La cantidad debe ser mayor que cero.");
											}
											const { getWarehousesForAdminFn } = await import(
												"../features/admin/warehouses.server-fns"
											);
											const { getProductsForAdminFn } = await import(
												"../features/admin/products.server-fns"
											);
											const [warehouses, products] = await Promise.all([
												getWarehousesForAdminFn(),
												getProductsForAdminFn(),
											]);
											const warehouse = warehouses[0];
											const product = products[0];
											if (!warehouse || !product) {
												throw new Error(
													"Faltan almacén o producto. Completa los pasos anteriores.",
												);
											}
											await setupCreateInitialStockFn({
												data: {
													supplier_id: supplier.supplierId,
													warehouse_id: warehouse.id,
													product_id: product.id,
													quantity: qty,
													unit_cost: Number.parseFloat(productForm.price) || 0,
													notes: "Stock inicial — configuración",
												},
											});
										})
									}
								>
									Registrar entrada de stock
								</button>
							</>
						) : null}

						{currentStep === "review_inventory" ? (
							<>
								<p className="text-sm text-muted-foreground">
									Revisa que el inventario refleja tu stock inicial.
								</p>
								<ul className="rounded-2xl border bg-muted/20 p-4 text-sm">
									{inventoryItems.length === 0 ? (
										<li>No hay líneas de inventario todavía.</li>
									) : (
										inventoryItems.slice(0, 8).map((row) => (
											<li key={`${row.product_id}-${row.warehouse_id}`}>
												{row.product_name}: {row.qty_on_hand} uds.
											</li>
										))
									)}
								</ul>
								<button
									type="button"
									disabled={isBusy}
									className="rounded-2xl border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
									onClick={() => refreshWizard()}
								>
									Continuar
								</button>
							</>
						) : null}

						{(currentStep === "configure_cash" ||
							currentStep === "open_cash") &&
						!wizard.setup.hasOpenCashSession ? (
							<>
								<p className="text-sm text-muted-foreground">
									Indica el fondo inicial de caja y ábrela para poder vender.
								</p>
								<label className="block space-y-1 text-sm">
									<span className="font-medium">Fondo inicial (€)</span>
									<input
										className="w-full rounded-2xl border px-3 py-2"
										value={openingFloat}
										onChange={(e) => setOpeningFloat(e.target.value)}
									/>
								</label>
								<button
									type="button"
									disabled={isBusy}
									className="rounded-2xl border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
									onClick={() =>
										runStep(async () => {
											await setupOpenCashSessionFn({
												data: {
													opening_float: Number.parseFloat(openingFloat) || 0,
												},
											});
										})
									}
								>
									Abrir caja
								</button>
							</>
						) : null}

						{currentStep === "complete" || wizard.setup.hasOpenCashSession ? (
							<>
								<p className="text-sm text-muted-foreground">
									¡Tu TPV está listo! Abre ventas con tu PIN de propietario.
								</p>
								<div className="flex flex-wrap gap-3">
									<button
										type="button"
										disabled={isBusy}
										className="rounded-2xl border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
										onClick={() =>
											runStep(async () => {
												const result = await finishBusinessSetupFn();
												window.location.assign(result.redirectTo);
											})
										}
									>
										Entrar a ventas
									</button>
									<Link
										to="/admin/audit"
										className="rounded-2xl border bg-background px-4 py-2 text-sm font-medium"
									>
										Ver auditoría
									</Link>
								</div>
							</>
						) : null}
					</div>
				</main>
			</div>
		</div>
	);
}
