import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { AppShell } from "../components/layout/app-shell";
import { PosOperatorPinScreen } from "../components/pos/pos-operator-pin-screen";
import { requirePosOperationTenantForRoute } from "../features/auth/route-guards";
import { getBusinessSetupStateFn } from "../features/business-setup/setup.rpc";
import {
	getActivePosOperatorFn,
	lockPosTerminalFn,
	verifyPosPinForTerminalFn,
} from "../features/pos-session/pos-session.rpc";
import {
	clearStoredPosOperatorToken,
	readStoredPosOperatorToken,
	writeStoredPosOperatorToken,
} from "../features/pos-session/pos-session-storage";
import type { ActivePosOperator } from "../features/pos-session/types";
import {
	buildFinalizeSaleLinesFromTicket,
	getPosSaleErrorMessage,
	POS_DEFAULT_TERMINAL_ID,
} from "../features/sales/build-pos-sale-payload";
import {
	getActiveCashSessionForPosFn,
	openCashSessionForPosFn,
} from "../features/sales/cash-session.server-fns";
import { finalizeSaleForPosFn } from "../features/sales/finalize-sale.server-fns";
import {
	getSaleReceiptByIdForPosFn,
	listRecentSalesForPosFn,
} from "../features/sales/sale-read-model.server-fns";
import type {
	SaleReceiptReadModel,
	SaleReceiptSummary,
} from "../features/sales/sale-read-model.types";
import {
	getSalesCatalogForPosFn,
	setPosTerminalWarehouseFn,
} from "../features/sales/sales.server-fns";
import { openCashDrawerFn } from "../features/sales/server-fns";
import type { CashSessionRow } from "../features/sales/transaction/schema-types";
import { useTicket } from "../features/sales/use-ticket";

export const Route = createFileRoute("/sales")({
	beforeLoad: async ({ location }) => {
		await requirePosOperationTenantForRoute(location.href);
	},
	loader: async () => {
		const [catalog, setup] = await Promise.all([
			getSalesCatalogForPosFn(),
			getBusinessSetupStateFn(),
		]);

		return {
			catalog,
			setupBlocked: Boolean(setup && !setup.setupCompleted),
		};
	},
	component: SalesPage,
});

function SetupIncompleteSalesBlock() {
	return (
		<AppShell title="TPV / Ventas">
			<div className="rounded-3xl border bg-card p-8 text-center">
				<h2 className="text-xl font-semibold">
					Configuración inicial pendiente
				</h2>
				<p className="mt-2 text-sm text-muted-foreground">
					Completa la configuración inicial antes de vender.
				</p>
				<Link
					to="/setup"
					className="mt-6 inline-flex rounded-2xl border border-primary bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
				>
					Ir a configuración
				</Link>
			</div>
		</AppShell>
	);
}

function SalesPage() {
	const { catalog, setupBlocked } = Route.useLoaderData();
	if (setupBlocked) {
		return <SetupIncompleteSalesBlock />;
	}
	return <SalesPosPage catalog={catalog} />;
}

function SalesPosPage({
	catalog,
}: {
	catalog: Awaited<ReturnType<typeof getSalesCatalogForPosFn>>;
}) {
	const { categories, products, operationalWarehouse, posWarehouse } = catalog;
	const [saleWarehouseId, setSaleWarehouseId] = useState(
		operationalWarehouse.id,
	);
	const {
		items,
		addItem,
		setItemQuantity,
		incrementItemQuantity,
		decrementItemQuantity,
		applyDiscountToItem,
		getLineTotal,
		getTotal,
		splitTotal,
		clearTicket,
	} = useTicket();

	/**
	 * =========================================================
	 * CATEGORÍA ACTIVA
	 * ---------------------------------------------------------
	 * Cambia la categoría inicial si quieres abrir otra por defecto.
	 * =========================================================
	 */
	const [activeFamilyId, setActiveFamilyId] = useState<string>(
		() => categories[0]?.id ?? "",
	);
	const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
	const [keypadValue, setKeypadValue] = useState("0");
	const [actionMessage, setActionMessage] = useState<string | null>(null);
	const [isProcessingDrawer, setIsProcessingDrawer] = useState(false);
	const [isFinalizingSale, setIsFinalizingSale] = useState(false);
	const [cashSession, setCashSession] = useState<CashSessionRow | null>(null);
	const [recentSales, setRecentSales] = useState<SaleReceiptSummary[]>([]);
	const [completedReceipt, setCompletedReceipt] =
		useState<SaleReceiptReadModel | null>(null);
	const [activeModal, setActiveModal] = useState<"discount" | "split" | null>(
		null,
	);
	const [posOperator, setPosOperator] = useState<ActivePosOperator | null>(
		null,
	);
	const [pinError, setPinError] = useState<string | null>(null);
	const [isUnlockingPin, setIsUnlockingPin] = useState(false);
	const [isOpeningCash, setIsOpeningCash] = useState(false);
	const [pinRequiresEmail, setPinRequiresEmail] = useState(false);
	const [negativeStockNotice, setNegativeStockNotice] = useState<string | null>(
		null,
	);

	useEffect(() => {
		setSaleWarehouseId(operationalWarehouse.id);
	}, [operationalWarehouse.id]);

	const refreshPosContext = useCallback(async () => {
		try {
			const session = await getActiveCashSessionForPosFn({
				data: { terminal_id: POS_DEFAULT_TERMINAL_ID },
			});
			setCashSession(session);

			const recent = await listRecentSalesForPosFn({
				data: { limit: 8, terminal_id: POS_DEFAULT_TERMINAL_ID },
			});
			setRecentSales(recent);
		} catch {
			setCashSession(null);
			setRecentSales([]);
		}
	}, []);

	useEffect(() => {
		void refreshPosContext();
	}, [refreshPosContext]);

	useEffect(() => {
		const stored = readStoredPosOperatorToken(POS_DEFAULT_TERMINAL_ID);
		if (!stored || posOperator) {
			return;
		}

		void getActivePosOperatorFn({
			data: {
				operator_token: stored,
				terminal_id: POS_DEFAULT_TERMINAL_ID,
			},
		}).then((session) => {
			if (session) {
				setPosOperator(session);
			} else {
				clearStoredPosOperatorToken(POS_DEFAULT_TERMINAL_ID);
			}
		});
	}, [posOperator]);

	async function handleUnlockPin(pin: string, email?: string) {
		setIsUnlockingPin(true);
		setPinError(null);
		try {
			const session = await verifyPosPinForTerminalFn({
				data: {
					pin,
					email,
					terminal_id: POS_DEFAULT_TERMINAL_ID,
				},
			});
			writeStoredPosOperatorToken(POS_DEFAULT_TERMINAL_ID, session.token);
			setPosOperator(session);
			setPinRequiresEmail(false);
		} catch (error) {
			const message = getPosSaleErrorMessage(error);
			setPinError(message);
			if (message.includes("email") || message.includes("Email")) {
				setPinRequiresEmail(true);
			}
		} finally {
			setIsUnlockingPin(false);
		}
	}

	async function handleLockPos() {
		const token =
			posOperator?.token ?? readStoredPosOperatorToken(POS_DEFAULT_TERMINAL_ID);
		if (token) {
			try {
				await lockPosTerminalFn({
					data: {
						terminal_id: POS_DEFAULT_TERMINAL_ID,
						operator_token: token,
					},
				});
			} catch {
				// ignore lock errors; client state still clears
			}
		}
		clearStoredPosOperatorToken(POS_DEFAULT_TERMINAL_ID);
		setPosOperator(null);
		clearTicket();
		setSelectedItemId(null);
		resetKeypad();
		setActionMessage("TPV bloqueado. Introduce tu PIN para continuar.");
	}

	async function handleSwitchEmployee() {
		await handleLockPos();
		setActionMessage("Introduce el PIN del siguiente empleado.");
	}

	async function handleOpenCashSession() {
		setIsOpeningCash(true);
		setActionMessage(null);
		try {
			const session = await openCashSessionForPosFn({
				data: { terminal_id: POS_DEFAULT_TERMINAL_ID, opening_float: 0 },
			});
			setCashSession(session);
			setActionMessage("Caja abierta. Introduce tu PIN para vender.");
		} catch (error) {
			setActionMessage(getPosSaleErrorMessage(error));
		} finally {
			setIsOpeningCash(false);
		}
	}

	const operatorToken =
		posOperator?.token ?? readStoredPosOperatorToken(POS_DEFAULT_TERMINAL_ID);
	const showOpenCash = !cashSession;
	const showPinGate = Boolean(cashSession && !operatorToken);

	useEffect(() => {
		if (!categories.length) {
			if (activeFamilyId !== "") {
				setActiveFamilyId("");
			}
			return;
		}

		const isActiveCategoryValid = categories.some(
			(category) => category.id === activeFamilyId,
		);

		if (!isActiveCategoryValid) {
			setActiveFamilyId(categories[0].id);
		}
	}, [activeFamilyId, categories]);

	const activeFamily =
		categories.find((family) => family.id === activeFamilyId) ??
		categories[0] ??
		null;

	const filteredProducts = products.filter(
		(product) => product.category_id === activeFamilyId,
	);

	const subtotal = getTotal();
	const tax = subtotal * 0.1;
	const total = subtotal + tax;
	const selectedItem =
		items.find((item) => item.id === selectedItemId) ??
		items[items.length - 1] ??
		null;

	const getNumericInput = useCallback(() => {
		const parsed = Number.parseFloat(keypadValue);
		if (!Number.isFinite(parsed)) return 0;
		return parsed;
	}, [keypadValue]);

	const resetKeypad = useCallback(() => {
		setKeypadValue("0");
	}, []);

	const appendKeypadDigit = useCallback((digit: string) => {
		setKeypadValue((prev) => {
			if (digit === "." && prev.includes(".")) return prev;
			if (prev === "0" && digit !== ".") return digit;
			return `${prev}${digit}`;
		});
	}, []);

	const backspaceKeypad = useCallback(() => {
		setKeypadValue((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0"));
	}, []);

	const requireSelectedItem = useCallback(() => {
		if (!selectedItem) {
			setActionMessage("Selecciona primero un producto del ticket.");
			return false;
		}
		return true;
	}, [selectedItem]);

	const applyEnterAction = useCallback(() => {
		if (!requireSelectedItem()) return;
		const quantity = Math.max(0, Math.floor(getNumericInput()));
		setItemQuantity(selectedItem.id, quantity);
		if (quantity === 0) {
			setSelectedItemId(null);
			setActionMessage(`"${selectedItem.name}" eliminado del ticket.`);
		} else {
			setActionMessage(`Cantidad de "${selectedItem.name}" = ${quantity}.`);
		}
		resetKeypad();
	}, [
		getNumericInput,
		requireSelectedItem,
		resetKeypad,
		selectedItem,
		setItemQuantity,
	]);

	const applyPlusAction = useCallback(() => {
		if (!requireSelectedItem()) return;
		const amount = Math.max(1, Math.floor(getNumericInput()));
		incrementItemQuantity(selectedItem.id, amount);
		setActionMessage(`+${amount} ud. en "${selectedItem.name}".`);
		resetKeypad();
	}, [
		getNumericInput,
		incrementItemQuantity,
		requireSelectedItem,
		resetKeypad,
		selectedItem,
	]);

	const applyMinusAction = useCallback(() => {
		if (!requireSelectedItem()) return;
		const amount = Math.max(1, Math.floor(getNumericInput()));
		decrementItemQuantity(selectedItem.id, amount);
		const remainingItem = items.find((item) => item.id === selectedItem.id);
		if (remainingItem && remainingItem.quantity - amount <= 0) {
			setSelectedItemId(null);
		}
		setActionMessage(`-${amount} ud. en "${selectedItem.name}".`);
		resetKeypad();
	}, [
		decrementItemQuantity,
		getNumericInput,
		items,
		requireSelectedItem,
		resetKeypad,
		selectedItem,
	]);

	function applyDiscountAction() {
		if (!requireSelectedItem()) return;
		const discount = Math.min(100, Math.max(0, getNumericInput()));
		applyDiscountToItem(selectedItem.id, discount);
		setActionMessage(
			`Descuento ${discount.toFixed(2)}% en "${selectedItem.name}".`,
		);
		resetKeypad();
	}

	function applySplitAction() {
		const parts = Math.max(1, Math.floor(getNumericInput()));
		const splitAmount = splitTotal(parts);
		setActionMessage(
			`División en ${parts} partes: ${splitAmount.toFixed(2)} € por parte.`,
		);
		resetKeypad();
	}

	function openDiscountModal() {
		if (!requireSelectedItem()) return;
		setActiveModal("discount");
	}

	function openSplitModal() {
		setActiveModal("split");
	}

	async function handleOpenDrawer() {
		try {
			setIsProcessingDrawer(true);
			const result = await openCashDrawerFn();
			setActionMessage(
				`${result.message} ${new Date(result.openedAt).toLocaleTimeString()}`,
			);
		} catch {
			setActionMessage("No se pudo abrir el cajón.");
		} finally {
			setIsProcessingDrawer(false);
		}
	}

	async function handleFinalizeSale() {
		if (items.length === 0) {
			setActionMessage("Añade productos antes de cobrar.");
			return;
		}

		if (!cashSession) {
			setActionMessage(
				"No hay sesión de caja abierta. Abre caja antes de cobrar.",
			);
			return;
		}

		if (!operatorToken) {
			setActionMessage("Introduce tu PIN para cobrar.");
			return;
		}

		try {
			setIsFinalizingSale(true);
			setActionMessage(null);
			setNegativeStockNotice(null);

			const finalizeResult = await finalizeSaleForPosFn({
				data: {
					client_request_id: crypto.randomUUID(),
					cash_session_id: cashSession.id,
					terminal_id: POS_DEFAULT_TERMINAL_ID,
					warehouse_id: saleWarehouseId,
					payment_method: "cash",
					operator_token: operatorToken,
					lines: buildFinalizeSaleLinesFromTicket(items),
				},
			});

			const receipt = await getSaleReceiptByIdForPosFn({
				data: { sale_id: finalizeResult.sale_id },
			});

			setCompletedReceipt(receipt);
			if (finalizeResult.negative_stock_items?.length) {
				setNegativeStockNotice(
					"Venta completada. Algunos productos quedaron en stock negativo.",
				);
			}
			clearTicket();
			setSelectedItemId(null);
			resetKeypad();
			await refreshPosContext();
		} catch (error) {
			setActionMessage(getPosSaleErrorMessage(error));
		} finally {
			setIsFinalizingSale(false);
		}
	}

	async function handleViewRecentReceipt(saleId: string) {
		try {
			const receipt = await getSaleReceiptByIdForPosFn({
				data: { sale_id: saleId },
			});
			setCompletedReceipt(receipt);
		} catch (error) {
			setActionMessage(getPosSaleErrorMessage(error));
		}
	}

	function closeReceiptModal() {
		setCompletedReceipt(null);
	}

	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if (
				event.target instanceof HTMLInputElement ||
				event.target instanceof HTMLTextAreaElement
			) {
				return;
			}

			if (/^[0-9]$/.test(event.key)) {
				appendKeypadDigit(event.key);
				return;
			}

			if (event.key === ".") {
				appendKeypadDigit(".");
				return;
			}

			if (event.key === "Backspace") {
				backspaceKeypad();
				return;
			}

			if (event.key === "Enter") {
				applyEnterAction();
				return;
			}

			if (event.key === "+") {
				applyPlusAction();
				return;
			}

			if (event.key === "-") {
				applyMinusAction();
			}
		}

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [
		appendKeypadDigit,
		applyEnterAction,
		applyMinusAction,
		applyPlusAction,
		backspaceKeypad,
	]);

	return (
		<AppShell title="Ventas">
			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<div className="space-y-1">
					{posOperator ? (
						<p className="text-sm text-muted-foreground">
							Operando:{" "}
							<span className="font-medium text-foreground">
								{posOperator.operator_name}
							</span>{" "}
							<span className="text-xs">({posOperator.role})</span>
						</p>
					) : (
						<p className="text-sm text-muted-foreground">TPV bloqueado</p>
					)}
					<div className="text-xs text-muted-foreground">
						<span>Almacén: </span>
						{posWarehouse.canChangeWarehouse ? (
							<select
								value={saleWarehouseId}
								onChange={async (event) => {
									const nextId = event.target.value;
									setSaleWarehouseId(nextId);
									try {
										await setPosTerminalWarehouseFn({
											data: {
												terminal_id: POS_DEFAULT_TERMINAL_ID,
												warehouse_id: nextId,
											},
										});
									} catch {
										setActionMessage("No se pudo cambiar el almacén de venta.");
									}
								}}
								className="ml-1 rounded-lg border bg-card px-2 py-1 text-xs text-foreground"
							>
								{posWarehouse.warehouses.map((warehouse) => (
									<option key={warehouse.id} value={warehouse.id}>
										{warehouse.name} ({warehouse.id})
									</option>
								))}
							</select>
						) : (
							<>
								<span className="font-medium text-foreground">
									{operationalWarehouse.name}
								</span>{" "}
								<span className="font-mono">({operationalWarehouse.id})</span>
							</>
						)}
					</div>
					{negativeStockNotice ? (
						<p className="text-xs text-amber-800">{negativeStockNotice}</p>
					) : null}
				</div>
				{operatorToken ? (
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							onClick={handleSwitchEmployee}
							className="rounded-2xl border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
						>
							Cambiar empleado
						</button>
						<button
							type="button"
							onClick={handleLockPos}
							className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
						>
							Bloquear TPV
						</button>
					</div>
				) : null}
			</div>
			{showOpenCash ? (
				<div className="mb-4 rounded-3xl border border-dashed bg-amber-50/80 p-6 text-center">
					<h2 className="text-lg font-semibold">
						Necesitas abrir caja para comenzar ventas
					</h2>
					<p className="mt-2 text-sm text-muted-foreground">
						Completa la configuración inicial o abre la sesión de caja desde el
						asistente de puesta en marcha.
					</p>
					<div className="mt-4 flex flex-wrap items-center justify-center gap-3">
						<Link
							to="/setup"
							className="rounded-2xl border border-primary bg-primary px-6 py-2 text-sm font-medium text-primary-foreground"
						>
							Continuar configuración
						</Link>
						<button
							type="button"
							disabled={isOpeningCash}
							onClick={handleOpenCashSession}
							className="rounded-2xl border bg-background px-6 py-2 text-sm font-medium hover:bg-muted"
						>
							{isOpeningCash ? "Abriendo..." : "Abrir caja ahora"}
						</button>
					</div>
				</div>
			) : null}

			{showPinGate ? (
				<PosOperatorPinScreen
					title="PIN TPV"
					description="Introduce tu PIN para operar en este terminal. La caja permanece abierta."
					requireEmail={pinRequiresEmail}
					isSubmitting={isUnlockingPin}
					errorMessage={pinError}
					onSubmit={handleUnlockPin}
				/>
			) : null}

			<div
				className={`grid h-[calc(100vh-8rem)] gap-6 xl:grid-cols-[0.58fr_1.98fr] ${showOpenCash || showPinGate ? "pointer-events-none opacity-40" : ""}`}
			>
				{/* =========================================================
            COLUMNA IZQUIERDA
            - Ticket actual
            - Teclado y acciones
           ========================================================= */}
				<div className="grid min-h-0 gap-6 xl:grid-rows-[1.2fr_0.95fr]">
					{/* =========================================================
              TICKET ACTUAL
             ========================================================= */}
					<section className="flex min-h-0 flex-col rounded-3xl border bg-card p-3.5">
						<div className="mb-2 border-b border-dashed pb-2">
							<p className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
								Venta actual
							</p>
							<h2 className="mt-1 text-xs font-semibold">
								{POS_DEFAULT_TERMINAL_ID}
								{cashSession ? " · Caja abierta" : " · Sin sesión de caja"}
							</h2>
							<p className="mt-1 text-[9px] text-muted-foreground">
								{recentSales[0]
									? `Último ticket #${recentSales[0].receipt_number}`
									: "Nueva venta"}
							</p>
							{recentSales.length > 0 ? (
								<div className="mt-2 flex flex-wrap gap-1">
									{recentSales.map((sale) => (
										<button
											key={sale.id}
											type="button"
											onClick={() => handleViewRecentReceipt(sale.id)}
											className="rounded-md border bg-background px-1.5 py-0.5 text-[9px] tabular-nums transition hover:bg-muted"
										>
											#{sale.receipt_number}
										</button>
									))}
								</div>
							) : null}
						</div>

						<div className="grid grid-cols-[minmax(0,1fr)_48px_84px] items-center gap-2 border-b border-dashed pb-2 text-[9px] uppercase tracking-wide text-muted-foreground">
							<span>Producto</span>
							<span className="justify-self-start pl-1">Ud.</span>
							<span className="justify-self-end pr-3">Total</span>
						</div>

						<div className="mt-2 flex-1 space-y-1 overflow-y-auto pr-1">
							{items.length === 0 ? (
								<div className="rounded-xl border border-dashed px-3 py-5 text-center text-[11px] text-muted-foreground">
									No hay productos en el ticket.
								</div>
							) : (
								items.map((item) => (
									<button
										key={item.id}
										type="button"
										onClick={() => setSelectedItemId(item.id)}
										className={`grid w-full grid-cols-[minmax(0,1fr)_48px_84px] items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] transition ${
											selectedItem?.id === item.id
												? "border border-primary bg-primary/10"
												: "bg-muted/40"
										}`}
									>
										<span className="truncate leading-tight">{item.name}</span>
										<span className="text-center tabular-nums">
											{item.quantity}
										</span>
										<span className="text-right tabular-nums font-medium">
											{getLineTotal(item).toFixed(2)} €
										</span>
									</button>
								))
							)}
						</div>

						<div className="mt-2 rounded-xl border border-dashed p-2.5 text-[11px] tabular-nums">
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Subtotal</span>
								<span>{subtotal.toFixed(2)} €</span>
							</div>
							<div className="mt-1 flex items-center justify-between">
								<span className="text-muted-foreground">IVA</span>
								<span>{tax.toFixed(2)} €</span>
							</div>
							<div className="mt-2 flex items-center justify-between border-t border-dashed pt-2 text-xs font-bold">
								<span>Total</span>
								<span>{total.toFixed(2)} €</span>
							</div>
						</div>
						<button
							type="button"
							disabled={isFinalizingSale || items.length === 0 || !cashSession}
							onClick={() => void handleFinalizeSale()}
							className="mt-2 w-full rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{isFinalizingSale ? "Cobrando..." : "Cobrar · Efectivo"}
						</button>
						<div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
							<span className="truncate">
								Seleccionado: {selectedItem ? selectedItem.name : "ninguno"}
							</span>
							<button
								type="button"
								onClick={clearTicket}
								className="rounded-md border px-2 py-1 text-[10px] transition hover:bg-muted"
							>
								Vaciar ticket
							</button>
						</div>
					</section>

					{/* =========================================================
              TECLADO Y ACCIONES
             ========================================================= */}
					<section className="rounded-3xl border bg-card p-4">
						<p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
							Teclado y acciones
						</p>
						<div className="mb-3 rounded-xl border border-dashed px-3 py-2 text-[11px]">
							<span className="font-semibold">Entrada:</span> {keypadValue}
							{actionMessage ? (
								<p className="mt-1 text-[10px] text-muted-foreground">
									{actionMessage}
								</p>
							) : null}
						</div>

						<div className="grid grid-cols-[repeat(3,72px)_72px_72px] gap-2.5">
							<button
								type="button"
								onClick={() => appendKeypadDigit("7")}
								className="aspect-square rounded-xl border bg-background text-base font-semibold transition hover:bg-muted"
							>
								7
							</button>
							<button
								type="button"
								onClick={() => appendKeypadDigit("8")}
								className="aspect-square rounded-xl border bg-background text-base font-semibold transition hover:bg-muted"
							>
								8
							</button>
							<button
								type="button"
								onClick={() => appendKeypadDigit("9")}
								className="aspect-square rounded-xl border bg-background text-base font-semibold transition hover:bg-muted"
							>
								9
							</button>
							<button
								type="button"
								onClick={backspaceKeypad}
								className="aspect-square rounded-xl border bg-background text-[12px] font-medium transition hover:bg-muted"
							>
								⌫
							</button>
							<button
								type="button"
								onClick={applyPlusAction}
								className="aspect-square rounded-xl border bg-background text-base font-semibold transition hover:bg-muted"
							>
								+
							</button>

							<button
								type="button"
								onClick={() => appendKeypadDigit("4")}
								className="aspect-square rounded-xl border bg-background text-base font-semibold transition hover:bg-muted"
							>
								4
							</button>
							<button
								type="button"
								onClick={() => appendKeypadDigit("5")}
								className="aspect-square rounded-xl border bg-background text-base font-semibold transition hover:bg-muted"
							>
								5
							</button>
							<button
								type="button"
								onClick={() => appendKeypadDigit("6")}
								className="aspect-square rounded-xl border bg-background text-base font-semibold transition hover:bg-muted"
							>
								6
							</button>
							<button
								type="button"
								onClick={openDiscountModal}
								className="aspect-square rounded-xl border bg-background text-[12px] font-medium transition hover:bg-muted"
							>
								Dto
							</button>
							<button
								type="button"
								onClick={applyMinusAction}
								className="aspect-square rounded-xl border bg-background text-base font-semibold transition hover:bg-muted"
							>
								-
							</button>

							<button
								type="button"
								onClick={() => appendKeypadDigit("1")}
								className="aspect-square rounded-xl border bg-background text-base font-semibold transition hover:bg-muted"
							>
								1
							</button>
							<button
								type="button"
								onClick={() => appendKeypadDigit("2")}
								className="aspect-square rounded-xl border bg-background text-base font-semibold transition hover:bg-muted"
							>
								2
							</button>
							<button
								type="button"
								onClick={() => appendKeypadDigit("3")}
								className="aspect-square rounded-xl border bg-background text-base font-semibold transition hover:bg-muted"
							>
								3
							</button>
							<button
								type="button"
								onClick={openSplitModal}
								className="aspect-square rounded-xl border bg-background text-[12px] font-medium transition hover:bg-muted"
							>
								Div
							</button>
							<button
								type="button"
								onClick={applyEnterAction}
								className="row-span-2 flex rounded-xl border border-primary/30 bg-primary/10 text-sm font-semibold text-primary transition hover:bg-primary/20"
							>
								<span className="m-auto">Enter</span>
							</button>

							<button
								type="button"
								onClick={() => appendKeypadDigit("0")}
								className="aspect-square rounded-xl border bg-background text-base font-semibold transition hover:bg-muted"
							>
								0
							</button>
							<button
								type="button"
								onClick={() => appendKeypadDigit(".")}
								className="aspect-square rounded-xl border bg-background text-base font-semibold transition hover:bg-muted"
							>
								.
							</button>
							<button
								type="button"
								onClick={resetKeypad}
								className="aspect-square rounded-xl border bg-background text-base font-semibold transition hover:bg-muted"
							>
								C
							</button>
							<button
								type="button"
								disabled={isProcessingDrawer}
								onClick={handleOpenDrawer}
								className="aspect-square rounded-xl border border-blue-200 bg-blue-50 text-[12px] font-medium text-blue-600 transition hover:bg-blue-100"
							>
								{isProcessingDrawer ? "..." : "Cajón"}
							</button>
						</div>
					</section>
				</div>

				{/* =========================================================
            COLUMNA DERECHA
            - Familias
            - Productos
           ========================================================= */}
				<div className="grid min-h-0 gap-6 xl:grid-rows-[0.78fr_1.4fr]">
					{/* =========================================================
              FAMILIAS / CATEGORÍAS
              - Aquí se renderizan los botones de familia
              - La familia activa cambia el estilo
             ========================================================= */}
					<section className="rounded-3xl border bg-card p-5">
						<div className="mb-4">
							<p className="text-sm text-muted-foreground">Familias</p>
							<h2 className="text-lg font-semibold">Categorías</h2>
						</div>

						<div className="grid grid-cols-3 gap-3">
							{categories.map((family) => {
								const isActive = family.id === activeFamilyId;

								return (
									<button
										key={family.id}
										type="button"
										onClick={() => setActiveFamilyId(family.id)}
										className={`rounded-2xl border px-4 py-3 text-left transition ${
											isActive
												? "border-primary bg-primary/10 shadow-sm"
												: "bg-background hover:bg-muted"
										}`}
									>
										<div className="flex items-center gap-3">
											<div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted">
												{family.image_url ? (
													<img
														src={family.image_url}
														alt={family.name}
														className="h-full w-full object-cover"
													/>
												) : (
													<div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] font-medium leading-tight text-muted-foreground">
														{family.name}
													</div>
												)}
											</div>
											<div className="min-w-0">
												<p className="text-sm font-semibold leading-tight">
													{family.name}
												</p>
												{family.description ? (
													<p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
														{family.description}
													</p>
												) : null}
											</div>
										</div>
									</button>
								);
							})}
						</div>
					</section>

					{/* =========================================================
              PRODUCTOS
              - Se filtran según la categoría activa
              - Si no hay imagen, se muestra el nombre centrado
             ========================================================= */}
					<section className="flex min-h-0 flex-col rounded-3xl border bg-card p-5">
						<div className="mb-4">
							<p className="text-sm text-muted-foreground">Productos</p>
							<h2 className="text-lg font-semibold">Selección rápida</h2>
							<p className="mt-1 text-sm text-muted-foreground">
								{activeFamily
									? `Mostrando productos de la categoría ${activeFamily.name}`
									: "No hay categorías activas para mostrar productos."}
							</p>
						</div>

						<div className="grid content-start grid-cols-[repeat(auto-fill,118px)] gap-3 overflow-y-auto pr-1">
							{filteredProducts.map((product) => (
								<button
									key={product.id}
									type="button"
									onClick={() => {
										addItem(product);
										setSelectedItemId(product.id);
										setActionMessage(`Producto añadido: ${product.name}`);
									}}
									className="w-29.5 rounded-3xl border bg-background p-2 text-left transition hover:bg-muted"
								>
									<div className="aspect-square overflow-hidden rounded-2xl bg-muted">
										{product.image_url ? (
											<img
												src={product.image_url}
												alt={product.name}
												className="h-full w-full object-cover"
											/>
										) : (
											<div className="flex h-full w-full items-center justify-center p-2 text-center text-sm font-semibold leading-tight text-foreground">
												{product.name}
											</div>
										)}
									</div>

									<div className="mt-1 flex items-center justify-end">
										<span className="text-sm font-semibold leading-none">
											{product.price.toFixed(2)} €
										</span>
									</div>
								</button>
							))}

							{/* Mensaje si una categoría no tiene productos */}
							{filteredProducts.length === 0 && (
								<div className="col-span-full rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
									No hay productos cargados para esta categoría.
								</div>
							)}
						</div>
					</section>
				</div>
			</div>

			{activeModal ? (
				<div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
					<div className="w-full max-w-md rounded-2xl border bg-card p-4 shadow-xl">
						<h3 className="text-base font-semibold">
							{activeModal === "discount"
								? "Aplicar descuento"
								: "Dividir cuenta"}
						</h3>
						<p className="mt-1 text-sm text-muted-foreground">
							{activeModal === "discount"
								? `Producto: ${selectedItem?.name ?? "ninguno"}`
								: "Número de partes para dividir el total."}
						</p>
						<label className="mt-4 block text-sm">
							<span className="mb-1 block text-muted-foreground">
								{activeModal === "discount" ? "Descuento (%)" : "Partes"}
							</span>
							<input
								type="number"
								min={activeModal === "discount" ? 0 : 1}
								max={activeModal === "discount" ? 100 : 99}
								step={activeModal === "discount" ? "0.01" : "1"}
								value={keypadValue}
								onChange={(event) => {
									const nextValue = event.target.value;
									setKeypadValue(nextValue === "" ? "0" : nextValue);
								}}
								className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none"
							/>
						</label>
						<div className="mt-4 flex items-center justify-end gap-2">
							<button
								type="button"
								onClick={() => setActiveModal(null)}
								className="rounded-xl border px-3 py-2 text-sm transition hover:bg-muted"
							>
								Cancelar
							</button>
							<button
								type="button"
								onClick={() => {
									if (activeModal === "discount") {
										applyDiscountAction();
									} else {
										applySplitAction();
									}
									setActiveModal(null);
								}}
								className="rounded-xl border border-primary bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
							>
								Confirmar
							</button>
						</div>
					</div>
				</div>
			) : null}

			{completedReceipt ? (
				<div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
					<div className="w-full max-w-lg rounded-2xl border bg-card p-4 shadow-xl">
						<div className="border-b border-dashed pb-3">
							<p className="text-[10px] uppercase tracking-[0.2em] text-emerald-700">
								Venta completada
							</p>
							<h3 className="mt-1 text-lg font-semibold tabular-nums">
								Ticket #{completedReceipt.sale.receipt_number}
							</h3>
							<p className="mt-1 text-xs text-muted-foreground">
								{new Date(completedReceipt.sale.created_at).toLocaleString()}
							</p>
						</div>

						<div className="mt-3 max-h-52 space-y-1 overflow-y-auto">
							{completedReceipt.items.map((line) => (
								<div
									key={line.id}
									className="flex items-center justify-between gap-2 text-sm"
								>
									<span className="truncate">
										{line.product_name} × {line.quantity}
									</span>
									<span className="shrink-0 tabular-nums font-medium">
										{line.line_total.toFixed(2)} €
									</span>
								</div>
							))}
						</div>

						<div className="mt-3 rounded-xl border border-dashed p-3 text-sm">
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Total</span>
								<span className="text-base font-bold tabular-nums">
									{completedReceipt.sale.total.toFixed(2)} €
								</span>
							</div>
							<div className="mt-2 flex items-center justify-between text-xs">
								<span className="text-muted-foreground">Pago</span>
								<span className="font-medium uppercase">
									{completedReceipt.payments[0]?.status ?? "—"}
								</span>
							</div>
						</div>

						<button
							type="button"
							onClick={closeReceiptModal}
							className="mt-4 w-full rounded-xl border border-primary bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
						>
							Nuevo ticket
						</button>
					</div>
				</div>
			) : null}
		</AppShell>
	);
}
