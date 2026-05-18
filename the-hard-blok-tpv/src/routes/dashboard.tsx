import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Banknote,
	CreditCard,
	Loader2,
	Receipt,
	ShoppingBag,
	Trophy,
	UserRound,
	XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AppShell } from "../components/layout/app-shell";
import { getAppUserFn } from "../features/auth/auth.rpc";
import { requireRoleForRoute } from "../features/auth/route-guards";
import type { Role } from "../features/auth/types";
import { getBusinessSetupStateFn } from "../features/business-setup/setup.rpc";
import type { BusinessSetupState } from "../features/business-setup/types";
import { SETUP_STEPS } from "../features/business-setup/types";
import {
	DASHBOARD_RANGE_LABELS,
	DASHBOARD_RANGE_VALUES,
	type DashboardData,
	type DashboardRange,
	DEFAULT_DASHBOARD_RANGE,
	isDashboardRange,
} from "../features/dashboard/types";

const DASHBOARD_ROLES: Role[] = ["owner", "manager"];

export const Route = createFileRoute("/dashboard")({
	beforeLoad: async ({ location }) => {
		await requireRoleForRoute(DASHBOARD_ROLES, location.href);
	},
	loader: async () => {
		const [user, setup] = await Promise.all([
			getAppUserFn(),
			getBusinessSetupStateFn(),
		]);
		return {
			userName: user?.name ?? "Usuario",
			setup,
		};
	},
	component: DashboardPage,
});

function formatCents(cents: number): string {
	const euros = cents / 100;
	return new Intl.NumberFormat("es-ES", {
		style: "currency",
		currency: "EUR",
		maximumFractionDigits: 2,
	}).format(euros);
}

function formatNumber(value: number): string {
	return new Intl.NumberFormat("es-ES").format(value);
}

function formatShortDate(dateKey: string): string {
	const [, month, day] = dateKey.split("-");
	return `${day}/${month}`;
}

function formatLongDate(dateKey: string): string {
	const date = new Date(`${dateKey}T00:00:00`);
	return new Intl.DateTimeFormat("es-ES", {
		weekday: "short",
		day: "2-digit",
		month: "short",
	}).format(date);
}

function formatPeriodLabel(range: DashboardRange): string {
	switch (range) {
		case "today":
			return "Hoy";
		case "7d":
			return "Últimos 7 días";
		case "30d":
			return "Últimos 30 días";
	}
}

function getRangeFromUrl(): DashboardRange {
	if (typeof window === "undefined") return DEFAULT_DASHBOARD_RANGE;
	const params = new URLSearchParams(window.location.search);
	const raw = params.get("range");
	return isDashboardRange(raw) ? raw : DEFAULT_DASHBOARD_RANGE;
}

function setRangeInUrl(range: DashboardRange) {
	if (typeof window === "undefined") return;
	const url = new URL(window.location.href);
	url.searchParams.set("range", range);
	window.history.replaceState(null, "", url.toString());
}

function DashboardPage() {
	const { userName, setup } = Route.useLoaderData();
	const [range, setRange] = useState<DashboardRange>(() => getRangeFromUrl());
	const [data, setData] = useState<DashboardData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const loadDashboard = useCallback(async (nextRange: DashboardRange) => {
		setIsLoading(true);
		setError(null);

		try {
			const response = await fetch(
				`/api/me/dashboard?range=${encodeURIComponent(nextRange)}`,
				{
					method: "GET",
					credentials: "include",
					headers: { Accept: "application/json" },
				},
			);

			if (!response.ok) {
				if (response.status === 401) {
					throw new Error("Sesión expirada. Vuelve a iniciar sesión.");
				}
				if (response.status === 403) {
					throw new Error(
						"No tienes permiso para ver el dashboard de negocio.",
					);
				}
				throw new Error(`Error al cargar el dashboard (${response.status}).`);
			}

			const json = (await response.json()) as DashboardData;
			setData(json);
		} catch (caught) {
			const message =
				caught instanceof Error
					? caught.message
					: "No se pudo cargar el dashboard.";
			setError(message);
			setData(null);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadDashboard(range);
	}, [range, loadDashboard]);

	function handleRangeChange(nextRange: DashboardRange) {
		if (nextRange === range) return;
		setRange(nextRange);
		setRangeInUrl(nextRange);
	}

	const periodLabel = formatPeriodLabel(range);
	const totals = data?.totals;
	const hasData = Boolean(data && data.totals.orders > 0);

	if (setup && !setup.setupCompleted) {
		return (
			<AppShell title="Dashboard">
				<SetupIncompletePanel userName={userName} setup={setup} />
			</AppShell>
		);
	}

	return (
		<AppShell title="Dashboard">
			<div className="flex flex-col gap-6">
				<DashboardHeader
					userName={userName}
					range={range}
					onRangeChange={handleRangeChange}
					isLoading={isLoading}
					periodLabel={periodLabel}
				/>

				{error ? (
					<ErrorState message={error} onRetry={() => loadDashboard(range)} />
				) : null}

				{!error && isLoading && !data ? <LoadingSkeleton /> : null}

				{!error && data ? (
					<>
						<KpiGrid totals={totals} periodLabel={periodLabel} />

						<SalesByDayChart
							data={data.salesByDay}
							range={range}
							hasData={hasData}
						/>

						<div className="grid gap-6 lg:grid-cols-2">
							<TopProductsCard products={data.topProducts} />
							<SalesByEmployeeCard employees={data.salesByEmployee} />
						</div>

						<QuickLinks />
					</>
				) : null}
			</div>
		</AppShell>
	);
}

function DashboardHeader({
	userName,
	range,
	onRangeChange,
	isLoading,
	periodLabel,
}: {
	userName: string;
	range: DashboardRange;
	onRangeChange: (range: DashboardRange) => void;
	isLoading: boolean;
	periodLabel: string;
}) {
	return (
		<div className="flex flex-col gap-3 rounded-3xl border bg-card p-5 md:flex-row md:items-center md:justify-between">
			<div>
				<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
					Operador activo
				</p>
				<h2 className="mt-1 text-xl font-semibold">{userName}</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Resumen de negocio · {periodLabel}
				</p>
			</div>

			<div className="flex items-center gap-3">
				{isLoading ? (
					<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
				) : null}
				<RangeSelector value={range} onChange={onRangeChange} />
			</div>
		</div>
	);
}

function RangeSelector({
	value,
	onChange,
}: {
	value: DashboardRange;
	onChange: (range: DashboardRange) => void;
}) {
	return (
		<div
			className="inline-flex rounded-2xl border bg-background p-1"
			role="tablist"
			aria-label="Rango de tiempo"
		>
			{DASHBOARD_RANGE_VALUES.map((option) => {
				const isActive = option === value;
				return (
					<button
						key={option}
						type="button"
						role="tab"
						aria-selected={isActive}
						onClick={() => onChange(option)}
						className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
							isActive
								? "bg-primary text-primary-foreground shadow-sm"
								: "text-muted-foreground hover:bg-muted"
						}`}
					>
						{DASHBOARD_RANGE_LABELS[option]}
					</button>
				);
			})}
		</div>
	);
}

function KpiGrid({
	totals,
	periodLabel,
}: {
	totals: DashboardData["totals"] | undefined;
	periodLabel: string;
}) {
	const safeTotals = totals ?? {
		totalSalesCents: 0,
		orders: 0,
		averageTicketCents: 0,
		cashCents: 0,
		cardCents: 0,
		cancelledOrders: 0,
	};

	const kpis = [
		{
			label: `Ventas · ${periodLabel}`,
			value: formatCents(safeTotals.totalSalesCents),
			Icon: Receipt,
			tone: "primary" as const,
		},
		{
			label: "Pedidos",
			value: formatNumber(safeTotals.orders),
			Icon: ShoppingBag,
			tone: "neutral" as const,
		},
		{
			label: "Ticket medio",
			value: formatCents(safeTotals.averageTicketCents),
			Icon: Trophy,
			tone: "neutral" as const,
		},
		{
			label: "Efectivo",
			value: formatCents(safeTotals.cashCents),
			Icon: Banknote,
			tone: "neutral" as const,
		},
		{
			label: "Tarjeta",
			value: formatCents(safeTotals.cardCents),
			Icon: CreditCard,
			tone: "neutral" as const,
		},
		{
			label: "Canceladas",
			value: formatNumber(safeTotals.cancelledOrders),
			Icon: XCircle,
			tone: "danger" as const,
		},
	];

	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
			{kpis.map((kpi) => {
				const Icon = kpi.Icon;
				const toneClasses =
					kpi.tone === "primary"
						? "border-primary/40 bg-primary/5"
						: kpi.tone === "danger"
							? "border-red-200 bg-red-50/40"
							: "bg-card";

				return (
					<div
						key={kpi.label}
						className={`rounded-3xl border p-5 ${toneClasses}`}
					>
						<div className="flex items-center justify-between">
							<p className="text-xs uppercase tracking-wide text-muted-foreground">
								{kpi.label}
							</p>
							<Icon className="h-4 w-4 text-muted-foreground" />
						</div>
						<p className="mt-3 text-2xl font-bold tabular-nums">{kpi.value}</p>
					</div>
				);
			})}
		</div>
	);
}

function SalesByDayChart({
	data,
	range,
	hasData,
}: {
	data: DashboardData["salesByDay"];
	range: DashboardRange;
	hasData: boolean;
}) {
	const maxCents = useMemo(() => {
		return data.reduce((max, day) => Math.max(max, day.totalSalesCents), 0);
	}, [data]);

	if (range === "today") {
		const today = data[0];
		return (
			<section className="rounded-3xl border bg-card p-6">
				<header className="mb-4">
					<h3 className="text-lg font-semibold">Ventas de hoy</h3>
					<p className="text-sm text-muted-foreground">
						Cambia a 7 días o 30 días para ver la evolución por día.
					</p>
				</header>

				{today ? (
					<div className="rounded-2xl border bg-background p-4">
						<p className="text-xs uppercase tracking-wide text-muted-foreground">
							{formatLongDate(today.date)}
						</p>
						<p className="mt-2 text-3xl font-bold tabular-nums">
							{formatCents(today.totalSalesCents)}
						</p>
						<p className="mt-1 text-sm text-muted-foreground">
							{formatNumber(today.orders)} pedidos
						</p>
					</div>
				) : null}
			</section>
		);
	}

	return (
		<section className="rounded-3xl border bg-card p-6">
			<header className="mb-4 flex items-end justify-between">
				<div>
					<h3 className="text-lg font-semibold">Ventas por día</h3>
					<p className="text-sm text-muted-foreground">
						{range === "7d" ? "Últimos 7 días" : "Últimos 30 días"} · barra =
						total ventas, valor sobre la barra
					</p>
				</div>
			</header>

			{!hasData ? (
				<EmptyState message="Sin ventas registradas en este periodo." />
			) : (
				<div
					className="grid items-end gap-2"
					style={{
						gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))`,
						minHeight: "180px",
					}}
				>
					{data.map((day) => {
						const ratio = maxCents > 0 ? day.totalSalesCents / maxCents : 0;
						const heightPct = Math.max(2, Math.round(ratio * 100));
						const isEmpty = day.totalSalesCents === 0;

						return (
							<div
								key={day.date}
								className="flex h-44 flex-col items-center justify-end gap-1"
								title={`${formatLongDate(day.date)} · ${formatCents(
									day.totalSalesCents,
								)} · ${formatNumber(day.orders)} pedidos`}
							>
								<span
									className={`text-[10px] tabular-nums ${
										isEmpty ? "text-muted-foreground/60" : "text-foreground"
									}`}
								>
									{isEmpty
										? "—"
										: formatCents(day.totalSalesCents).replace(/\u00A0/g, " ")}
								</span>
								<div
									className={`w-full rounded-t-md transition-all ${
										isEmpty ? "bg-muted" : "bg-primary"
									}`}
									style={{ height: `${heightPct}%` }}
								/>
								<span className="text-[10px] tabular-nums text-muted-foreground">
									{formatShortDate(day.date)}
								</span>
							</div>
						);
					})}
				</div>
			)}
		</section>
	);
}

function TopProductsCard({
	products,
}: {
	products: DashboardData["topProducts"];
}) {
	return (
		<section className="rounded-3xl border bg-card p-6">
			<header className="mb-4">
				<h3 className="text-lg font-semibold">Top productos</h3>
				<p className="text-sm text-muted-foreground">
					Ranking por facturación en el periodo.
				</p>
			</header>

			{products.length === 0 ? (
				<EmptyState message="Sin productos vendidos en este periodo." />
			) : (
				<ol className="space-y-2">
					{products.map((product, index) => {
						const rank = index + 1;
						const rankBadgeClasses =
							rank === 1
								? "bg-amber-100 text-amber-700 border-amber-200"
								: rank === 2
									? "bg-slate-100 text-slate-700 border-slate-200"
									: rank === 3
										? "bg-orange-100 text-orange-700 border-orange-200"
										: "bg-muted text-muted-foreground border-transparent";

						return (
							<li
								key={product.productId ?? `top-${product.productName}-${rank}`}
								className="flex items-center justify-between gap-3 rounded-2xl border bg-background px-3 py-2"
							>
								<div className="flex items-center gap-3 min-w-0">
									<span
										className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-sm font-bold ${rankBadgeClasses}`}
										title={`Posición ${rank}`}
									>
										{rank}
									</span>
									<span className="truncate text-sm font-medium">
										{product.productName}
									</span>
								</div>
								<div className="flex shrink-0 items-center gap-4 text-right tabular-nums">
									<span className="text-xs text-muted-foreground">
										{formatNumber(product.units)} ud.
									</span>
									<span className="text-sm font-semibold">
										{formatCents(product.revenueCents)}
									</span>
								</div>
							</li>
						);
					})}
				</ol>
			)}
		</section>
	);
}

function SalesByEmployeeCard({
	employees,
}: {
	employees: DashboardData["salesByEmployee"];
}) {
	return (
		<section className="rounded-3xl border bg-card p-6">
			<header className="mb-4">
				<h3 className="text-lg font-semibold">Ventas por empleado</h3>
				<p className="text-sm text-muted-foreground">
					Total facturado, pedidos y ticket medio.
				</p>
			</header>

			{employees.length === 0 ? (
				<EmptyState message="Sin ventas asignadas a empleados en este periodo." />
			) : (
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
								<th className="px-2 py-2">Empleado</th>
								<th className="px-2 py-2 text-right">Ventas</th>
								<th className="px-2 py-2 text-right">Pedidos</th>
								<th className="px-2 py-2 text-right">Ticket medio</th>
							</tr>
						</thead>
						<tbody>
							{employees.map((employee) => (
								<tr key={employee.employeeName} className="border-t">
									<td className="px-2 py-2">
										<div className="flex items-center gap-2">
											<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
												<UserRound className="h-3.5 w-3.5 text-muted-foreground" />
											</span>
											<span className="font-medium">
												{employee.employeeName}
											</span>
										</div>
									</td>
									<td className="px-2 py-2 text-right tabular-nums font-semibold">
										{formatCents(employee.totalSalesCents)}
									</td>
									<td className="px-2 py-2 text-right tabular-nums">
										{formatNumber(employee.orders)}
									</td>
									<td className="px-2 py-2 text-right tabular-nums">
										{formatCents(employee.averageTicketCents)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</section>
	);
}

function QuickLinks() {
	return (
		<div className="grid gap-4 md:grid-cols-3">
			<Link
				to="/sales"
				className="rounded-3xl border bg-background p-5 transition hover:bg-muted/50"
			>
				<p className="text-xs uppercase tracking-wide text-muted-foreground">
					Ir a
				</p>
				<p className="mt-2 text-lg font-semibold">Ventas</p>
				<p className="mt-1 text-sm text-muted-foreground">
					Abrir el TPV y registrar tickets.
				</p>
			</Link>

			<Link
				to="/admin"
				className="rounded-3xl border bg-background p-5 transition hover:bg-muted/50"
			>
				<p className="text-xs uppercase tracking-wide text-muted-foreground">
					Ir a
				</p>
				<p className="mt-2 text-lg font-semibold">Administración</p>
				<p className="mt-1 text-sm text-muted-foreground">
					Catálogo, almacenes, compras e inventario.
				</p>
			</Link>

			<Link
				to="/admin/inventory"
				className="rounded-3xl border bg-background p-5 transition hover:bg-muted/50"
			>
				<p className="text-xs uppercase tracking-wide text-muted-foreground">
					Ir a
				</p>
				<p className="mt-2 text-lg font-semibold">Inventario</p>
				<p className="mt-1 text-sm text-muted-foreground">
					Stock por almacén, lotes y caducidad.
				</p>
			</Link>
		</div>
	);
}

const SKELETON_KPI_KEYS = [
	"sales",
	"orders",
	"avg-ticket",
	"cash",
	"card",
	"cancelled",
];

function LoadingSkeleton() {
	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
			{SKELETON_KPI_KEYS.map((key) => (
				<div
					key={key}
					className="h-28 animate-pulse rounded-3xl border bg-muted/40"
				/>
			))}
		</div>
	);
}

const SETUP_STEP_LABELS: Record<string, string> = {
	confirm_business: "Datos del negocio",
	warehouse: "Almacén",
	category: "Categoría",
	product: "Producto",
	initial_stock: "Stock inicial",
	review_inventory: "Inventario",
	configure_cash: "Caja",
	open_cash: "Abrir caja",
	complete: "Listo",
};

function SetupIncompletePanel({
	userName,
	setup,
}: {
	userName: string;
	setup: BusinessSetupState;
}) {
	const totalSteps = SETUP_STEPS.filter((s) => s !== "complete").length;
	const doneCount = setup.completedSteps.filter((s) => s !== "complete").length;
	const progress = Math.round((doneCount / totalSteps) * 100);

	return (
		<div className="flex flex-col gap-6">
			<div className="rounded-3xl border bg-card p-6">
				<p className="text-sm text-muted-foreground">Hola, {userName}</p>
				<h2 className="mt-1 text-2xl font-semibold">
					Termina la configuración de tu TPV
				</h2>
				<p className="mt-2 max-w-xl text-sm text-muted-foreground">
					Completa los pasos para desbloquear ventas, inventario y el resto de
					módulos. Las métricas del dashboard aparecerán cuando empieces a
					vender.
				</p>
				<div className="mt-6">
					<div className="mb-2 flex justify-between text-sm">
						<span>Progreso</span>
						<span className="font-medium">{progress}%</span>
					</div>
					<div className="h-2 overflow-hidden rounded-full bg-muted">
						<div
							className="h-full rounded-full bg-primary transition-all"
							style={{ width: `${progress}%` }}
						/>
					</div>
					<p className="mt-2 text-xs text-muted-foreground">
						Siguiente paso:{" "}
						{SETUP_STEP_LABELS[setup.currentStep] ?? setup.currentStep}
					</p>
				</div>
				<Link
					to="/setup"
					className="mt-6 inline-flex rounded-2xl border border-primary bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
				>
					Continuar configuración
				</Link>
			</div>
		</div>
	);
}

function ErrorState({
	message,
	onRetry,
}: {
	message: string;
	onRetry: () => void;
}) {
	return (
		<div className="flex items-center justify-between gap-4 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
			<div>
				<p className="font-semibold">No se pudo cargar el dashboard</p>
				<p className="mt-1 text-red-700/90">{message}</p>
			</div>
			<button
				type="button"
				onClick={onRetry}
				className="rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
			>
				Reintentar
			</button>
		</div>
	);
}

function EmptyState({ message }: { message: string }) {
	return (
		<div className="rounded-2xl border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
			{message}
		</div>
	);
}
