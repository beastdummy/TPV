import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "../components/layout/app-shell";
import { getAppUserFn } from "../features/auth/auth.rpc";
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
	const { items, addItem, getTotal } = useTicket();

	/**
	 * =========================================================
	 * CATEGORÍA ACTIVA
	 * ---------------------------------------------------------
	 * Cambia la categoría inicial si quieres abrir otra por defecto.
	 * =========================================================
	 */
	const [activeFamilyId, setActiveFamilyId] =
		useState<(typeof families)[number]["id"]>("soft-drinks");

	const activeFamily =
		families.find((family) => family.id === activeFamilyId) ?? families[0];

	const filteredProducts = products.filter(
		(product) => product.familyId === activeFamilyId,
	);

	const subtotal = getTotal();
	const tax = subtotal * 0.1;
	const total = subtotal + tax;

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
										className="grid grid-cols-[minmax(0,1fr)_48px_84px] items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5 text-[11px]"
									>
										<span className="truncate leading-tight">{item.name}</span>
										<span className="text-center tabular-nums">
											{item.quantity}
										</span>
										<div className="text-right tabular-nums font-medium">
											{(item.price * item.quantity).toFixed(2)} €
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
					</section>

					{/* =========================================================
              TECLADO Y ACCIONES
             ========================================================= */}
					<section className="rounded-3xl border bg-card p-4">
						<p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
							Teclado y acciones
						</p>

						<div className="grid grid-cols-[repeat(3,72px)_72px_72px] gap-2.5">
							<button
								type="button"
								className="aspect-square rounded-xl border bg-background text-base font-semibold transition hover:bg-muted"
							>
								7
							</button>
							<button
								type="button"
								className="aspect-square rounded-xl border bg-background text-base font-semibold transition hover:bg-muted"
							>
								8
							</button>
							<button
								type="button"
								className="aspect-square rounded-xl border bg-background text-base font-semibold transition hover:bg-muted"
							>
								9
							</button>
							<button
								type="button"
								className="aspect-square rounded-xl border bg-background text-[12px] font-medium transition hover:bg-muted"
							>
								Teclado
							</button>
							<button
								type="button"
								className="aspect-square rounded-xl border bg-background text-base font-semibold transition hover:bg-muted"
							>
								+
							</button>

							<button
								type="button"
								className="aspect-square rounded-xl border bg-background text-base font-semibold transition hover:bg-muted"
							>
								4
							</button>
							<button
								type="button"
								className="aspect-square rounded-xl border bg-background text-base font-semibold transition hover:bg-muted"
							>
								5
							</button>
							<button
								type="button"
								className="aspect-square rounded-xl border bg-background text-base font-semibold transition hover:bg-muted"
							>
								6
							</button>
							<button
								type="button"
								className="aspect-square rounded-xl border bg-background text-[12px] font-medium transition hover:bg-muted"
							>
								Dto
							</button>
							<button
								type="button"
								className="aspect-square rounded-xl border bg-background text-base font-semibold transition hover:bg-muted"
							>
								-
							</button>

							<button
								type="button"
								className="aspect-square rounded-xl border bg-background text-base font-semibold transition hover:bg-muted"
							>
								1
							</button>
							<button
								type="button"
								className="aspect-square rounded-xl border bg-background text-base font-semibold transition hover:bg-muted"
							>
								2
							</button>
							<button
								type="button"
								className="aspect-square rounded-xl border bg-background text-base font-semibold transition hover:bg-muted"
							>
								3
							</button>
							<button
								type="button"
								className="aspect-square rounded-xl border bg-background text-[12px] font-medium transition hover:bg-muted"
							>
								Div
							</button>
							<button
								type="button"
								className="row-span-2 flex rounded-xl border border-primary/30 bg-primary/10 text-sm font-semibold text-primary transition hover:bg-primary/20"
							>
								<span className="m-auto">Enter</span>
							</button>

							<button
								type="button"
								className="aspect-square rounded-xl border bg-background text-base font-semibold transition hover:bg-muted"
							>
								0
							</button>
							<button
								type="button"
								className="aspect-square rounded-xl border bg-background text-base font-semibold transition hover:bg-muted"
							>
								.
							</button>
							<button
								type="button"
								className="aspect-square rounded-xl border bg-background text-base font-semibold transition hover:bg-muted"
							>
								C
							</button>
							<button
								type="button"
								className="aspect-square rounded-xl border border-blue-200 bg-blue-50 text-[12px] font-medium text-blue-600 transition hover:bg-blue-100"
							>
								Cajón
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
									onClick={() => addItem(product)}
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
		</AppShell>
	);
}
