import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { CheckCircle2, Circle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	SetupCreatedList,
	SetupWizardNav,
} from "../components/setup/setup-wizard-nav";
import { requireSetupPageForRoute } from "../features/auth/route-guards";
import {
	completeSetupStaffStepFn,
	confirmBusinessSetupDetailsFn,
	finishBusinessSetupFn,
	loadSetupWizardContextFn,
	markCashConfiguredStepFn,
	markInventoryReviewedStepFn,
	setupCreateCategoryFn,
	setupCreateEmployeeFn,
	setupCreateInitialStockFn,
	setupCreateProductFn,
	setupCreateQuickRoleFn,
	setupCreateWarehouseFn,
	setupOpenCashSessionFn,
	setupSetOperationalWarehouseFn,
} from "../features/business-setup/setup.rpc";
import { ConfirmBusinessStepForm } from "../features/business-setup/setup-confirm-business-step";
import { formatSetupRpcError } from "../features/business-setup/setup-errors";
import {
	getNextSetupStep,
	getPreviousSetupStep,
	getSetupContinueBlockedMessage,
	snapshotFromSetupState,
} from "../features/business-setup/setup-navigation";
import { SETUP_QUICK_ROLE_PRESETS } from "../features/business-setup/setup-role-presets";
import {
	isSetupReadyForCompletion,
	normalizeSetupStep,
} from "../features/business-setup/setup-step-resolution";
import {
	clampActiveSetupStep,
	getSafeSetupState,
	isSetupOperationallyReady,
} from "../features/business-setup/setup-wizard-state";
import type { SetupStep } from "../features/business-setup/types";
import { SETUP_STEPS } from "../features/business-setup/types";

const STEP_LABELS: Record<SetupStep, string> = {
	confirm_business: "Datos del negocio",
	warehouse: "Almacenes",
	category: "Familia / categoría",
	product: "Producto",
	initial_stock: "Compra / entrada inicial",
	review_inventory: "Revisar inventario",
	configure_cash: "Configurar caja",
	staff: "Empleados y roles (opcional)",
	open_cash: "Abrir caja",
	complete: "Listo para vender",
};

export const Route = createFileRoute("/setup")({
	beforeLoad: async ({ location }) => {
		await requireSetupPageForRoute(location.href);
	},
	loader: async () => {
		const wizard = await loadSetupWizardContextFn();
		return { wizard };
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
	const { wizard: initialWizard } = Route.useLoaderData();
	const router = useRouter();
	const [wizard, setWizard] = useState(initialWizard);
	const setupState = useMemo(
		() => getSafeSetupState(wizard?.setup),
		[wizard?.setup],
	);
	const initialRequiredStep = normalizeSetupStep(
		initialWizard?.setup?.currentStep,
	);
	const [activeStep, setActiveStep] = useState<SetupStep>(() =>
		clampActiveSetupStep(
			initialRequiredStep,
			initialRequiredStep,
			initialWizard?.setup,
		),
	);
	const [error, setError] = useState<string | null>(null);
	const [isBusy, setIsBusy] = useState(false);

	const requiredStep = setupState.currentStep;
	const setupSnapshot = useMemo(
		() => snapshotFromSetupState(setupState),
		[setupState],
	);
	const isOperationallyReady = isSetupOperationallyReady(setupState);
	const showReadyToSell =
		isOperationallyReady &&
		requiredStep === "complete" &&
		activeStep === "complete";
	const showIncompleteFinal = activeStep === "complete" && !showReadyToSell;
	const headerTitle = showIncompleteFinal
		? "Configuración incompleta"
		: STEP_LABELS[activeStep];
	const displayStep = showIncompleteFinal ? requiredStep : activeStep;

	const stepIndex = useMemo(
		() => SETUP_STEPS.indexOf(displayStep),
		[displayStep],
	);

	useEffect(() => {
		if (isBusy) {
			return;
		}
		const clamped = clampActiveSetupStep(activeStep, requiredStep, setupState);
		if (clamped !== activeStep) {
			setActiveStep(clamped);
		}
	}, [activeStep, requiredStep, setupState, isBusy]);

	async function refreshWizard(options?: { preserveActiveStep?: boolean }) {
		const next = await loadSetupWizardContextFn();
		setWizard(next);
		setOperationalWarehouse(next.operationalWarehouse ?? null);
		const nextSetup = getSafeSetupState(next?.setup);
		const nextRequired = nextSetup.currentStep;
		if (!options?.preserveActiveStep) {
			setActiveStep(
				clampActiveSetupStep(nextRequired, nextRequired, nextSetup),
			);
		} else {
			setActiveStep((current) =>
				clampActiveSetupStep(current, nextRequired, nextSetup),
			);
		}
		await router.invalidate();
	}

	function goBack() {
		const previous = getPreviousSetupStep(activeStep);
		if (previous) {
			setActiveStep(previous);
			setError(null);
		}
	}

	function handleContinue() {
		if (activeStep === "review_inventory") {
			void handleReviewInventoryContinue();
			return;
		}
		const blocked = getSetupContinueBlockedMessage(activeStep, setupSnapshot);
		if (blocked) {
			setError(blocked);
			return;
		}
		const next = getNextSetupStep(activeStep);
		if (next) {
			setActiveStep(next);
			setError(null);
		}
	}

	function applyWizardResult(result: {
		business?: (typeof wizard)["business"];
		setup: (typeof wizard)["setup"];
		operationalWarehouse?: { id: string; name: string } | null;
		productStockLines?: (typeof wizard)["productStockLines"];
		products?: (typeof wizard)["products"];
		staff?: (typeof wizard)["staff"];
	}) {
		const nextOperational =
			result.operationalWarehouse ?? wizard.operationalWarehouse;
		if (result.operationalWarehouse) {
			setOperationalWarehouse(result.operationalWarehouse);
		}
		setWizard((prev) => ({
			business: result.business ?? prev?.business,
			setup: result.setup ?? prev?.setup ?? setupState,
			operationalWarehouse: nextOperational,
			productStockLines:
				result.productStockLines ?? prev?.productStockLines ?? [],
			products: result.products ?? prev?.products ?? [],
			staff: result.staff ??
				prev?.staff ?? { employees: [], roles: [], hasCustomRoles: false },
			categories: prev?.categories ?? [],
			warehouses: prev?.warehouses ?? [],
			suppliers: prev?.suppliers ?? [],
		}));
	}

	async function runStep(
		action: () => Promise<void>,
		options?: { preserveActiveStep?: boolean; advanceTo?: SetupStep },
	) {
		setError(null);
		setIsBusy(true);
		try {
			await action();
			const preserveActive =
				options?.advanceTo !== undefined
					? true
					: (options?.preserveActiveStep ?? true);
			await refreshWizard({ preserveActiveStep: preserveActive });
			if (options?.advanceTo) {
				setActiveStep(options.advanceTo);
			}
		} catch (caught) {
			setError(formatSetupRpcError(caught));
		} finally {
			setIsBusy(false);
		}
	}

	async function handleReviewInventoryContinue() {
		if (productStockLines.length === 0) {
			setError("Registra stock antes de revisar el inventario.");
			return;
		}
		await runStep(
			async () => {
				const result = await markInventoryReviewedStepFn();
				if (!result.setup.inventoryReviewed) {
					throw new Error(
						"No se pudo guardar la revisión del inventario. Inténtalo de nuevo.",
					);
				}
				applyWizardResult({
					setup: result.setup,
					productStockLines: result.productStockLines,
				});
			},
			{ advanceTo: "configure_cash" },
		);
	}

	const [businessForm, setBusinessForm] = useState({
		name: initialWizard.business.name,
		legal_name: initialWizard.business.legal_name,
		timezone: initialWizard.business.timezone,
	});
	const [warehouseName, setWarehouseName] = useState("");
	const [operationalWarehouse, setOperationalWarehouse] = useState(
		initialWizard.operationalWarehouse,
	);
	const [categoryName, setCategoryName] = useState("General");
	const [selectedCategoryId, setSelectedCategoryId] = useState(
		initialWizard.categories[0]?.id ?? "",
	);
	const [productForm, setProductForm] = useState({
		name: "",
		price: "1.00",
	});
	const [stockForm, setStockForm] = useState({
		productId: "",
		quantity: "10",
		unitCost: "",
		supplierId: "",
		reason: "initial_stock" as "initial_purchase" | "initial_stock",
	});
	const [openingFloat, setOpeningFloat] = useState("0");
	const [employeeForm, setEmployeeForm] = useState({
		name: "",
		email: "",
		role_slug: "",
		pin: "",
	});

	const productStockLines = wizard?.productStockLines ?? [];
	const setupProducts = wizard?.products ?? [];
	const setupCategories = wizard?.categories ?? [];
	const setupStaff = wizard?.staff ?? {
		employees: [],
		roles: [],
		hasCustomRoles: false,
	};
	const assignableRoles = setupStaff.roles;
	const selectedEmployeeRole =
		employeeForm.role_slug || assignableRoles[0]?.slug || "";
	const canGoBack = getPreviousSetupStep(activeStep) !== null;

	async function finishStaffStep(advanceTo: SetupStep = "open_cash") {
		await runStep(
			async () => {
				const result = await completeSetupStaffStepFn();
				applyWizardResult({ setup: result.setup, staff: result.staff });
			},
			{ preserveActiveStep: false, advanceTo },
		);
	}

	const btnPrimary =
		"rounded-2xl border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50";
	const btnSecondary =
		"rounded-2xl border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50";

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
									const done = setupState.completedSteps.includes(step);
									const active = step === displayStep;
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
						Paso {Math.min(stepIndex + 1, 10)} de 10
					</p>
					<h2 className="mt-1 text-2xl font-semibold">{headerTitle}</h2>
					{showIncompleteFinal ? (
						<p className="mt-2 text-sm text-muted-foreground">
							Faltan pasos obligatorios antes de poder vender. Continúa desde el
							paso pendiente.
						</p>
					) : null}
					{!showIncompleteFinal && activeStep !== requiredStep ? (
						<p className="mt-1 text-xs text-amber-800">
							Paso pendiente mínimo: {STEP_LABELS[requiredStep]}
						</p>
					) : null}
					{showIncompleteFinal ? (
						<p className="mt-1 text-xs text-amber-800">
							Paso pendiente: {STEP_LABELS[requiredStep]}
						</p>
					) : null}

					{error && activeStep !== "confirm_business" ? (
						<p
							role="alert"
							className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
						>
							{error}
						</p>
					) : null}

					<div className="mt-6 space-y-4">
						{activeStep === "confirm_business" ? (
							<ConfirmBusinessStepForm
								values={businessForm}
								error={error}
								isBusy={isBusy}
								onChange={setBusinessForm}
								onSubmit={(values) =>
									runStep(
										async () => {
											const result = await confirmBusinessSetupDetailsFn({
												data: values,
											});
											applyWizardResult(result);
											setBusinessForm({
												name: result.business.name,
												legal_name: result.business.legal_name,
												timezone: result.business.timezone,
											});
										},
										{
											preserveActiveStep: false,
											advanceTo: "warehouse",
										},
									)
								}
							/>
						) : null}

						{activeStep === "warehouse" ? (
							<>
								<p className="text-sm text-muted-foreground">
									Crea el almacén principal y, si quieres, almacenes
									adicionales. Marca cuál es el operativo (ventas y stock
									inicial).
								</p>
								<SetupCreatedList
									title="Almacenes creados"
									items={wizard.warehouses.map((warehouse) => {
										const tags = [
											warehouse.is_operational ? "operativo" : null,
											warehouse.is_default ? "por defecto" : null,
										].filter(Boolean);
										return tags.length > 0
											? `${warehouse.name} (${tags.join(", ")})`
											: warehouse.name;
									})}
									emptyLabel="Aún no hay almacenes."
								/>
								{wizard.warehouses.length > 0 ? (
									<fieldset className="space-y-2 rounded-2xl border bg-muted/20 p-4 text-sm">
										<legend className="px-1 font-medium">
											Almacén operativo
										</legend>
										{wizard.warehouses.map((warehouse) => (
											<label
												key={warehouse.id}
												className="flex cursor-pointer items-center gap-2"
											>
												<input
													type="radio"
													name="operational-warehouse"
													checked={
														(operationalWarehouse?.id ?? "") === warehouse.id
													}
													disabled={isBusy}
													onChange={() =>
														runStep(async () => {
															const result =
																await setupSetOperationalWarehouseFn({
																	data: { warehouse_id: warehouse.id },
																});
															setOperationalWarehouse({
																id: result.warehouseId,
																name: result.warehouseName,
															});
														})
													}
												/>
												<span>{warehouse.name}</span>
											</label>
										))}
									</fieldset>
								) : null}
								<label className="block space-y-1 text-sm">
									<span className="font-medium">Nombre del almacén</span>
									<input
										className="w-full rounded-2xl border px-3 py-2"
										placeholder="Ej: Barra"
										value={warehouseName}
										onChange={(e) => setWarehouseName(e.target.value)}
									/>
								</label>
								<SetupWizardNav
									showBack={canGoBack}
									onBack={goBack}
									secondaryActions={
										<button
											type="button"
											disabled={isBusy || !warehouseName.trim()}
											className={btnSecondary}
											onClick={() =>
												runStep(async () => {
													const id = normalizeWarehouseId(warehouseName);
													if (!id) {
														throw new Error("Nombre de almacén inválido.");
													}
													const created = await setupCreateWarehouseFn({
														data: { id, name: warehouseName.trim() },
													});
													if (created.isOperational) {
														setOperationalWarehouse({
															id: created.warehouseId,
															name: created.warehouseName,
														});
													}
													setWarehouseName("");
												})
											}
										>
											{wizard.warehouses.length === 0
												? "Crear almacén principal"
												: "Crear otro almacén"}
										</button>
									}
									primaryActions={
										<button
											type="button"
											disabled={isBusy}
											className={btnPrimary}
											onClick={handleContinue}
										>
											Continuar a familias
										</button>
									}
								/>
							</>
						) : null}

						{activeStep === "category" ? (
							<>
								<SetupCreatedList
									title="Familias creadas"
									items={setupCategories.map((c) => c.name)}
									emptyLabel="Aún no hay familias."
								/>
								<label className="block space-y-1 text-sm">
									<span className="font-medium">Nombre de la familia</span>
									<input
										className="w-full rounded-2xl border px-3 py-2"
										value={categoryName}
										onChange={(e) => setCategoryName(e.target.value)}
									/>
								</label>
								<SetupWizardNav
									showBack={canGoBack}
									onBack={goBack}
									secondaryActions={
										<>
											<button
												type="button"
												disabled={isBusy || !categoryName.trim()}
												className={btnSecondary}
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
														setSelectedCategoryId(id);
														setCategoryName("");
													})
												}
											>
												Crear otra familia
											</button>
										</>
									}
									primaryActions={
										<button
											type="button"
											disabled={isBusy}
											className={btnPrimary}
											onClick={handleContinue}
										>
											Continuar a producto
										</button>
									}
								/>
							</>
						) : null}

						{activeStep === "product" ? (
							<>
								<p className="text-sm text-muted-foreground">
									Solo crea el producto (sin cantidad). El stock se registrará
									en el siguiente paso.
								</p>
								<SetupCreatedList
									title="Productos creados"
									items={setupProducts.map((p) => p.name)}
									emptyLabel="Aún no hay productos."
								/>
								<label className="block space-y-1 text-sm">
									<span className="font-medium">Familia</span>
									<select
										className="w-full rounded-2xl border px-3 py-2"
										value={selectedCategoryId || setupCategories[0]?.id || ""}
										onChange={(e) => setSelectedCategoryId(e.target.value)}
									>
										{setupCategories.length === 0 ? (
											<option value="">Crea una familia antes</option>
										) : (
											setupCategories.map((category) => (
												<option key={category.id} value={category.id}>
													{category.name}
												</option>
											))
										)}
									</select>
								</label>
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
								<SetupWizardNav
									showBack={canGoBack}
									onBack={goBack}
									secondaryActions={
										<button
											type="button"
											disabled={
												isBusy ||
												!productForm.name.trim() ||
												setupCategories.length === 0
											}
											className={btnSecondary}
											onClick={() =>
												runStep(async () => {
													if (!operationalWarehouse?.id) {
														throw new Error(
															"Crea el almacén principal antes del producto.",
														);
													}
													const categoryId =
														selectedCategoryId || setupCategories[0]?.id;
													if (!categoryId) {
														throw new Error("Selecciona una familia.");
													}
													const created = await setupCreateProductFn({
														data: {
															name: productForm.name.trim(),
															description: "",
															price: Number.parseFloat(productForm.price) || 0,
															category_id: categoryId,
															image_url: "",
															tax_rate: 10,
															warehouse: operationalWarehouse.id,
															sort_order: 0,
														},
													});
													setStockForm((form) => ({
														...form,
														productId: created.productId,
														unitCost: productForm.price,
													}));
													setProductForm({ name: "", price: "1.00" });
												})
											}
										>
											Crear otro producto
										</button>
									}
									primaryActions={
										<button
											type="button"
											disabled={isBusy}
											className={btnPrimary}
											onClick={handleContinue}
										>
											Continuar a compra / entrada inicial
										</button>
									}
								/>
							</>
						) : null}

						{activeStep === "initial_stock" ? (
							<>
								<p className="text-sm text-muted-foreground">
									Registra la primera compra o entrada en{" "}
									<strong>
										{operationalWarehouse?.name ?? "el almacén operativo"}
									</strong>
									. Sin este paso no podrás revisar inventario.
								</p>
								<label className="block space-y-1 text-sm">
									<span className="font-medium">Producto</span>
									<select
										className="w-full rounded-2xl border px-3 py-2"
										value={stockForm.productId || setupProducts[0]?.id || ""}
										onChange={(e) =>
											setStockForm((form) => ({
												...form,
												productId: e.target.value,
											}))
										}
									>
										{setupProducts.length === 0 ? (
											<option value="">Crea un producto antes</option>
										) : (
											setupProducts.map((product) => (
												<option key={product.id} value={product.id}>
													{product.name}
												</option>
											))
										)}
									</select>
								</label>
								<label className="block space-y-1 text-sm">
									<span className="font-medium">Cantidad</span>
									<input
										type="number"
										min="0.001"
										step="0.001"
										className="w-full rounded-2xl border px-3 py-2"
										value={stockForm.quantity}
										onChange={(e) =>
											setStockForm((form) => ({
												...form,
												quantity: e.target.value,
											}))
										}
									/>
								</label>
								<label className="block space-y-1 text-sm">
									<span className="font-medium">
										Coste unitario (€, opcional)
									</span>
									<input
										type="number"
										min="0"
										step="0.01"
										className="w-full rounded-2xl border px-3 py-2"
										value={stockForm.unitCost}
										onChange={(e) =>
											setStockForm((form) => ({
												...form,
												unitCost: e.target.value,
											}))
										}
									/>
								</label>
								<label className="block space-y-1 text-sm">
									<span className="font-medium">Proveedor (opcional)</span>
									<select
										className="w-full rounded-2xl border px-3 py-2"
										value={stockForm.supplierId}
										onChange={(e) =>
											setStockForm((form) => ({
												...form,
												supplierId: e.target.value,
											}))
										}
									>
										<option value="">Sin proveedor</option>
										{wizard.suppliers.map((supplier) => (
											<option key={supplier.id} value={supplier.id}>
												{supplier.name}
											</option>
										))}
									</select>
								</label>
								<label className="block space-y-1 text-sm">
									<span className="font-medium">Motivo</span>
									<select
										className="w-full rounded-2xl border px-3 py-2"
										value={stockForm.reason}
										onChange={(e) =>
											setStockForm((form) => ({
												...form,
												reason: e.target.value as
													| "initial_purchase"
													| "initial_stock",
											}))
										}
									>
										<option value="initial_stock">Entrada inicial</option>
										<option value="initial_purchase">Compra inicial</option>
									</select>
								</label>
								<SetupCreatedList
									title="Entradas de stock registradas"
									items={productStockLines.map(
										(row) =>
											`${row.product_name} · ${row.warehouse_name}: ${row.quantity} uds.`,
									)}
									emptyLabel="Aún no hay entradas de stock."
								/>
								<SetupWizardNav
									showBack={canGoBack}
									onBack={goBack}
									secondaryActions={
										<button
											type="button"
											disabled={isBusy || setupProducts.length === 0}
											className={btnSecondary}
											onClick={() =>
												runStep(async () => {
													const productId =
														stockForm.productId || setupProducts[0]?.id;
													const qty =
														Number.parseFloat(stockForm.quantity) || 0;
													if (!productId) {
														throw new Error("Selecciona un producto.");
													}
													if (qty <= 0) {
														throw new Error(
															"La cantidad debe ser mayor que cero.",
														);
													}
													if (!operationalWarehouse?.id) {
														throw new Error("Falta el almacén operativo.");
													}
													await setupCreateInitialStockFn({
														data: {
															product_id: productId,
															quantity: qty,
															unit_cost:
																Number.parseFloat(stockForm.unitCost) || 0,
															supplier_id: stockForm.supplierId || null,
															reason: stockForm.reason,
															notes: "Entrada inicial — configuración",
														},
													});
												})
											}
										>
											Añadir otra entrada
										</button>
									}
									primaryActions={
										<button
											type="button"
											disabled={isBusy}
											className={btnPrimary}
											onClick={handleContinue}
										>
											Revisar inventario
										</button>
									}
								/>
							</>
						) : null}

						{activeStep === "review_inventory" ? (
							<>
								<p className="text-sm text-muted-foreground">
									Revisa el stock registrado en product_stock (almacén
									operativo).
								</p>
								<SetupCreatedList
									title="Stock registrado"
									items={productStockLines.map(
										(row) =>
											`${row.product_name} · ${row.warehouse_name}: ${row.quantity} uds.`,
									)}
									emptyLabel="No hay stock registrado. Vuelve al paso anterior para registrar una entrada."
								/>
								<SetupWizardNav
									showBack={canGoBack}
									onBack={goBack}
									primaryActions={
										productStockLines.length > 0 ? (
											<button
												type="button"
												disabled={isBusy}
												className={btnPrimary}
												onClick={() => void handleReviewInventoryContinue()}
											>
												Continuar
											</button>
										) : (
											<button
												type="button"
												className={btnSecondary}
												onClick={() => {
													setActiveStep("initial_stock");
													setError(null);
												}}
											>
												Volver a compra / entrada inicial
											</button>
										)
									}
								/>
							</>
						) : null}

						{activeStep === "configure_cash" ? (
							<>
								<p className="text-sm text-muted-foreground">
									Indica el fondo inicial de caja para este TPV.
								</p>
								<label className="block space-y-1 text-sm">
									<span className="font-medium">Fondo inicial (€)</span>
									<input
										className="w-full rounded-2xl border px-3 py-2"
										value={openingFloat}
										onChange={(e) => setOpeningFloat(e.target.value)}
									/>
								</label>
								<SetupWizardNav
									showBack={canGoBack}
									onBack={goBack}
									primaryActions={
										<button
											type="button"
											disabled={isBusy}
											className={btnPrimary}
											onClick={() =>
												runStep(
													async () => {
														const result = await markCashConfiguredStepFn({
															data: {
																opening_float:
																	Number.parseFloat(openingFloat) || 0,
															},
														});
														applyWizardResult({ setup: result.setup });
													},
													{
														preserveActiveStep: false,
														advanceTo: "staff",
													},
												)
											}
										>
											Guardar y continuar
										</button>
									}
								/>
							</>
						) : null}

						{activeStep === "staff" ? (
							<>
								<p className="text-sm text-muted-foreground">
									Opcional: crea empleados con PIN y roles ahora, o configúralos
									más tarde en administración. El propietario puede vender solo
									con su PIN.
								</p>
								<SetupCreatedList
									title="Empleados creados"
									items={setupStaff.employees.map(
										(employee) =>
											`${employee.name} · ${employee.role_name}${employee.has_pin ? " · PIN" : ""}`,
									)}
									emptyLabel="Sin empleados extra todavía."
								/>
								{!setupStaff.hasCustomRoles ? (
									<div className="space-y-2 rounded-2xl border bg-muted/20 p-4">
										<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
											Roles rápidos (opcional)
										</p>
										<div className="flex flex-wrap gap-2">
											{SETUP_QUICK_ROLE_PRESETS.map((preset) => (
												<button
													key={preset.key}
													type="button"
													disabled={isBusy}
													className={btnSecondary}
													onClick={() =>
														runStep(async () => {
															const result = await setupCreateQuickRoleFn({
																data: { preset: preset.key },
															});
															applyWizardResult({ staff: result.staff });
															setEmployeeForm((form) => ({
																...form,
																role_slug: preset.slug,
															}));
														})
													}
												>
													{preset.name}
												</button>
											))}
										</div>
									</div>
								) : null}
								<div className="grid gap-3 sm:grid-cols-2">
									<label className="block space-y-1 text-sm sm:col-span-2">
										<span className="font-medium">Nombre</span>
										<input
											className="w-full rounded-2xl border px-3 py-2"
											value={employeeForm.name}
											onChange={(e) =>
												setEmployeeForm((form) => ({
													...form,
													name: e.target.value,
												}))
											}
										/>
									</label>
									<label className="block space-y-1 text-sm sm:col-span-2">
										<span className="font-medium">Email</span>
										<input
											type="email"
											className="w-full rounded-2xl border px-3 py-2"
											value={employeeForm.email}
											onChange={(e) =>
												setEmployeeForm((form) => ({
													...form,
													email: e.target.value,
												}))
											}
										/>
									</label>
									<label className="block space-y-1 text-sm">
										<span className="font-medium">Rol</span>
										<select
											className="w-full rounded-2xl border px-3 py-2"
											value={selectedEmployeeRole}
											onChange={(e) =>
												setEmployeeForm((form) => ({
													...form,
													role_slug: e.target.value,
												}))
											}
										>
											{assignableRoles.length === 0 ? (
												<option value="">Crea un rol rápido arriba</option>
											) : (
												assignableRoles.map((role) => (
													<option key={role.id} value={role.slug}>
														{role.name}
													</option>
												))
											)}
										</select>
									</label>
									<label className="block space-y-1 text-sm">
										<span className="font-medium">PIN TPV (4-8 dígitos)</span>
										<input
											type="password"
											inputMode="numeric"
											className="w-full rounded-2xl border px-3 py-2"
											value={employeeForm.pin}
											onChange={(e) =>
												setEmployeeForm((form) => ({
													...form,
													pin: e.target.value,
												}))
											}
										/>
									</label>
								</div>
								<SetupWizardNav
									showBack={canGoBack}
									onBack={goBack}
									secondaryActions={
										<>
											<button
												type="button"
												disabled={
													isBusy ||
													!employeeForm.name.trim() ||
													!employeeForm.email.trim() ||
													!/^\d{4,8}$/.test(employeeForm.pin)
												}
												className={btnSecondary}
												onClick={() =>
													runStep(async () => {
														const result = await setupCreateEmployeeFn({
															data: {
																name: employeeForm.name.trim(),
																email: employeeForm.email.trim(),
																role_slug: selectedEmployeeRole,
																pin: employeeForm.pin,
															},
														});
														applyWizardResult({ staff: result.staff });
														setEmployeeForm({
															name: "",
															email: "",
															role_slug: selectedEmployeeRole,
															pin: "",
														});
													})
												}
											>
												Crear empleado
											</button>
											<button
												type="button"
												disabled={isBusy}
												className={btnSecondary}
												onClick={() => finishStaffStep("open_cash")}
											>
												Saltar por ahora
											</button>
										</>
									}
									primaryActions={
										<button
											type="button"
											disabled={isBusy}
											className={btnPrimary}
											onClick={() => finishStaffStep("open_cash")}
										>
											Continuar
										</button>
									}
								/>
							</>
						) : null}

						{activeStep === "open_cash" ? (
							<>
								<p className="text-sm text-muted-foreground">
									Abre la sesión de caja con fondo inicial de{" "}
									{openingFloat || "0"} €.
								</p>
								<SetupWizardNav
									showBack={canGoBack}
									onBack={goBack}
									primaryActions={
										<button
											type="button"
											disabled={isBusy}
											className={btnPrimary}
											onClick={() =>
												runStep(async () => {
													const result = await setupOpenCashSessionFn({
														data: {
															opening_float:
																Number.parseFloat(openingFloat) || 0,
														},
													});
													if (result.setup) {
														applyWizardResult({ setup: result.setup });
													}
													const nextSetup = getSafeSetupState(result.setup);
													if (
														isSetupReadyForCompletion({
															businessDetailsConfirmed:
																nextSetup.businessDetailsConfirmed,
															hasWarehouse: nextSetup.hasWarehouse,
															hasCategory: nextSetup.hasCategory,
															hasProduct: nextSetup.hasProduct,
															hasInitialStock: nextSetup.hasInitialStock,
															inventoryReviewed: nextSetup.inventoryReviewed,
															cashConfigured: nextSetup.cashConfigured,
															staffStepHandled: nextSetup.staffStepHandled,
															hasOpenCashSession: nextSetup.hasOpenCashSession,
															setupCompleted: nextSetup.setupCompleted,
														})
													) {
														setActiveStep("complete");
													}
												})
											}
										>
											Abrir caja
										</button>
									}
								/>
							</>
						) : null}

						{showIncompleteFinal ? (
							<SetupWizardNav
								showBack={canGoBack}
								onBack={goBack}
								primaryActions={
									<button
										type="button"
										className={btnPrimary}
										onClick={() => {
											setActiveStep(requiredStep);
											setError(null);
										}}
									>
										Continuar configuración
									</button>
								}
							/>
						) : null}

						{showReadyToSell ? (
							<>
								<p className="text-sm text-muted-foreground">
									¡Tu TPV está listo! Abre ventas con tu PIN de propietario.
								</p>
								<div className="flex flex-wrap gap-3">
									<button
										type="button"
										disabled={isBusy || !isOperationallyReady}
										className="rounded-2xl border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
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
