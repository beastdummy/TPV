export const DASHBOARD_RANGE_VALUES = ["today", "7d", "30d"] as const;
export type DashboardRange = (typeof DASHBOARD_RANGE_VALUES)[number];

export const DEFAULT_DASHBOARD_RANGE: DashboardRange = "today";

export function isDashboardRange(value: unknown): value is DashboardRange {
	return (
		typeof value === "string" &&
		(DASHBOARD_RANGE_VALUES as readonly string[]).includes(value)
	);
}

export const DASHBOARD_RANGE_LABELS: Record<DashboardRange, string> = {
	today: "Hoy",
	"7d": "7 días",
	"30d": "30 días",
};

export type DashboardTotals = {
	totalSalesCents: number;
	orders: number;
	averageTicketCents: number;
	cashCents: number;
	cardCents: number;
	cancelledOrders: number;
};

export type DashboardSalesByDay = {
	date: string;
	totalSalesCents: number;
	orders: number;
};

export type DashboardSalesByEmployee = {
	employeeName: string;
	totalSalesCents: number;
	orders: number;
	averageTicketCents: number;
};

export type DashboardTopProduct = {
	productId: string | null;
	productName: string;
	units: number;
	revenueCents: number;
};

export type DashboardData = {
	range: DashboardRange;
	periodStart: string;
	periodEnd: string;
	totals: DashboardTotals;
	salesByDay: DashboardSalesByDay[];
	salesByEmployee: DashboardSalesByEmployee[];
	topProducts: DashboardTopProduct[];
};
