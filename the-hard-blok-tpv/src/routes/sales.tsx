import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AppShell } from "../components/layout/app-shell";
import { getAppUserFn } from "../features/auth/auth.rpc";
import { openCashDrawerFn } from "../features/sales/server-fns";
import { useTicket } from "../features/sales/use-ticket";

export const Route = createFileRoute("/sales")({
	beforeLoad: async ({ location }) => {
		const user = await getAppUserFn();
		if (!user) {
			throw redirect({ to: "/login", search: { redirect: location.href } });
		}
	},
	component: SalesPage,
});

/**
 * =========================================================
 * CONFIGURACIÓN DE FAMILIAS
 * ---------------------------------------------------------
 * Aquí puedes:
 * - cambiar el nombre de la familia
 * - cambiar la descripción
 * - cambiar el id
 * =========================================================
 */
const families = [
	{
		id: "soft-drinks",
		name: "Refrescos",
		description: "Bebidas frías sin alcohol",
	},
	{
		id: "beer",
		name: "Cervezas",
		description: "Rubias, tostadas y especiales",
	},
	{
		id: "wine",
		name: "Vinos",
		description: "Tintos, blancos y rosados",
	},
	{
		id: "cocktails",
		name: "Cócteles",
		description: "Mezclas y combinaciones preparadas",
	},
	{
		id: "coffee",
		name: "Cafés",
		description: "Café solo, con leche y variantes",
	},
	{
		id: "spirits",
		name: "Copas",
		description: "Destilados y copas premium",
	},
] as const;

/**
 * =========================================================
 * CONFIGURACIÓN DE PRODUCTOS
 * ---------------------------------------------------------
 * Aquí puedes editar:
 * - name: nombre visible
 * - price: precio
 * - image: ruta futura de imagen
 * - familyId: familia a la que pertenece
 * =========================================================
 */
const products = [
	{
		id: "1",
		name: "Coca-Cola",
		price: 2.5,
		image: "",
		familyId: "soft-drinks",
	},
	{ id: "2", name: "Fanta", price: 2.5, image: "", familyId: "soft-drinks" },
	{ id: "3", name: "Tónica", price: 2.2, image: "", familyId: "soft-drinks" },
	{ id: "4", name: "Sprite", price: 2.5, image: "", familyId: "soft-drinks" },

	{ id: "5", name: "Cerveza", price: 3, image: "", familyId: "beer" },

	{ id: "6", name: "Copa premium", price: 8.5, image: "", familyId: "spirits" },

	{ id: "7", name: "Café Solo", price: 1.4, image: "", familyId: "coffee" },
	{
		id: "8",
		name: "Café con leche",
		price: 1.8,
		image: "",
		familyId: "coffee",
	},
] as const;

function SalesPage() {
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
	const [activeFamilyId, setActiveFamilyId] =
		useState<(typeof families)[number]["id"]>("soft-drinks");
	const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
	const [keypadValue, setKeypadValue] = useState("0");
	const [actionMessage, setActionMessage] = useState<string | null>(null);
	const [isProcessingDrawer, setIsProcessingDrawer] = useState(false);
	const [activeModal, setActiveModal] = useState<"discount" | "split" | null>(
		null,
	);

	const activeFamily =
		families.find((family) => family.id === activeFamilyId) ?? families[0];

	const filteredProducts = products.filter(
		(product) => product.familyId === activeFamilyId,
	);

	const subtotal = getTotal();
	const tax = subtotal * 0.1;
	const total = subtotal + tax;
	const selectedItem =
		items.find((item) => item.id === selectedItemId) ?? items[items.length - 1] ?? null;

	function getNumericInput() {
		const parsed = Number.parseFloat(keypadValue);
		if (!Number.isFinite(parsed)) return 0;
		return parsed;
	}

	function resetKeypad() {
		setKeypadValue("0");
	}

	function appendKeypadDigit(digit: string) {
		setKeypadValue((prev) => {
			if (digit === "." && prev.includes(".")) return prev;
			if (prev === "0" && digit !== ".") return digit;
			return `${prev}${digit}`;
		});
	}

	function backspaceKeypad() {
		setKeypadValue((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0"));
	}

	function requireSelectedItem() {
		if (!selectedItem) {
			setActionMessage("Selecciona primero un producto del ticket.");
			return false;
		}
		return true;
	}

	function applyEnterAction() {
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
	}

	function applyPlusAction() {
		if (!requireSelectedItem()) return;
		const amount = Math.max(1, Math.floor(getNumericInput()));
		incrementItemQuantity(selectedItem.id, amount);
		setActionMessage(`+${amount} ud. en "${selectedItem.name}".`);
		resetKeypad();
	}

	function applyMinusAction() {
		if (!requireSelectedItem()) return;
		const amount = Math.max(1, Math.floor(getNumericInput()));
		decrementItemQuantity(selectedItem.id, amount);
		const remainingItem = items.find((item) => item.id === selectedItem.id);
		if (remainingItem && remainingItem.quantity - amount <= 0) {
			setSelectedItemId(null);
		}
		setActionMessage(`-${amount} ud. en "${selectedItem.name}".`);
		resetKeypad();
	}

	function applyDiscountAction() {
		if (!requireSelectedItem()) return;
		const discount = Math.min(100, Math.max(0, getNumericInput()));
		applyDiscountToItem(selectedItem.id, discount);
		setActionMessage(`Descuento ${discount.toFixed(2)}% en "${selectedItem.name}".`);
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
			setActionMessage(`${result.message} ${new Date(result.openedAt).toLocaleTimeString()}`);
		} catch {
			setActionMessage("No se pudo abrir el cajón.");
		} finally {
			setIsProcessingDrawer(false);
		}
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
	}, [applyEnterAction, applyMinusAction, applyPlusAction]);

	return (
		<AppShell title="Ventas">
			<div className="grid h-[calc(100vh-8rem)] gap-6 xl:grid-cols-[0.58fr_1.98fr]">
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
								Mesa 4 · Ticket #0001
							</h2>
							<p className="mt-1 text-[9px] text-muted-foreground">
								Sala interior
							</p>
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
									<div
										key={item.id}
										onClick={() => setSelectedItemId(item.id)}
										onKeyDown={(event) => {
											if (event.key === "Enter" || event.key === " ") {
												event.preventDefault();
												setSelectedItemId(item.id);
											}
										}}
										className={`grid grid-cols-[minmax(0,1fr)_48px_84px] items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] transition ${
											selectedItem?.id === item.id
												? "border border-primary bg-primary/10"
												: "bg-muted/40"
										}`}
										role="button"
										tabIndex={0}
									>
										<span className="truncate leading-tight">{item.name}</span>
										<span className="text-center tabular-nums">
											{item.quantity}
										</span>
										<div className="text-right tabular-nums font-medium">
											{getLineTotal(item).toFixed(2)} €
										</div>
									</div>
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
							{families.map((family) => {
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
										<div>
											<p className="text-sm font-semibold leading-tight">
												{family.name}
											</p>
											<p className="mt-1 text-xs text-muted-foreground">
												{family.description}
											</p>
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
								Mostrando productos de la categoría {activeFamily.name}
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
										{product.image ? (
											<img
												src={product.image}
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
							{activeModal === "discount" ? "Aplicar descuento" : "Dividir cuenta"}
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
		</AppShell>
	);
}
