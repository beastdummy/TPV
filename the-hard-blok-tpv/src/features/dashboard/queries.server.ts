import { db } from "../../lib/db.server";
import type {
	DashboardData,
	DashboardRange,
	DashboardSalesByDay,
	DashboardSalesByEmployee,
	DashboardTopProduct,
	DashboardTotals,
} from "./types";

type GetDashboardArgs = {
	range: DashboardRange;
	businessId?: string | null;
};

/**
 * Boundaries del periodo según rango.
 *
 * - today: [hoy 00:00, mañana 00:00)
 * - 7d:    [hace 6 días 00:00, mañana 00:00)  → 7 días naturales incluyendo hoy
 * - 30d:   [hace 29 días 00:00, mañana 00:00) → 30 días naturales incluyendo hoy
 *
 * Se calculan en hora local del servidor para coincidir con la operativa diaria
 * del TPV (apertura/cierre de caja en la zona horaria local del negocio).
 */
function getPeriodBounds(range: DashboardRange): {
	start: Date;
	end: Date;
} {
	const now = new Date();
	const startOfToday = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
		0,
		0,
		0,
		0,
	);
	const startOfTomorrow = new Date(startOfToday);
	startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

	switch (range) {
		case "today":
			return { start: startOfToday, end: startOfTomorrow };
		case "7d": {
			const start = new Date(startOfToday);
			start.setDate(start.getDate() - 6);
			return { start, end: startOfTomorrow };
		}
		case "30d": {
			const start = new Date(startOfToday);
			start.setDate(start.getDate() - 29);
			return { start, end: startOfTomorrow };
		}
	}
}

function formatLocalDateKey(date: Date): string {
	const year = date.getFullYear();
	const month = `${date.getMonth() + 1}`.padStart(2, "0");
	const day = `${date.getDate()}`.padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function buildEmptyDayBuckets(
	start: Date,
	end: Date,
): Map<string, DashboardSalesByDay> {
	const buckets = new Map<string, DashboardSalesByDay>();
	const cursor = new Date(start);

	while (cursor < end) {
		const key = formatLocalDateKey(cursor);
		buckets.set(key, { date: key, totalSalesCents: 0, orders: 0 });
		cursor.setDate(cursor.getDate() + 1);
	}

	return buckets;
}

/**
 * Comprueba si la tabla `sales` existe en el esquema.
 * El TPV se entrega con catálogo + stock + compras antes de tener ventas reales,
 * por lo que el dashboard debe funcionar igualmente devolviendo ceros.
 */
async function salesTableExists(): Promise<boolean> {
	const result = await db.query<{ exists: boolean }>(
		`SELECT (to_regclass('public.sales') IS NOT NULL) AS exists`,
	);
	return result.rows[0]?.exists ?? false;
}

function emptyTotals(): DashboardTotals {
	return {
		totalSalesCents: 0,
		orders: 0,
		averageTicketCents: 0,
		cashCents: 0,
		cardCents: 0,
		cancelledOrders: 0,
	};
}

export async function getDashboardData(
	args: GetDashboardArgs,
): Promise<DashboardData> {
	const { start, end } = getPeriodBounds(args.range);
	const businessId = args.businessId ?? null;

	const skeleton: DashboardData = {
		range: args.range,
		periodStart: start.toISOString(),
		periodEnd: end.toISOString(),
		totals: emptyTotals(),
		salesByDay: Array.from(buildEmptyDayBuckets(start, end).values()),
		salesByEmployee: [],
		topProducts: [],
	};

	if (!(await salesTableExists())) {
		return skeleton;
	}

	const businessFilter = businessId
		? `AND s.business_id = $3::uuid`
		: `AND ($3::uuid IS NULL)`;
	const params = [start.toISOString(), end.toISOString(), businessId];

	const totalsPromise = db.query<{
		total_sales_cents: string | null;
		orders: string | null;
		cash_cents: string | null;
		card_cents: string | null;
		cancelled_orders: string | null;
	}>(
		`
    SELECT
      COALESCE(SUM(CASE
        WHEN s.status = 'completed' THEN ROUND(s.total * 100)
      END), 0)::bigint AS total_sales_cents,
      COUNT(*) FILTER (WHERE s.status = 'completed')::bigint AS orders,
      COALESCE(SUM(CASE
        WHEN s.status = 'completed' AND s.payment_method = 'cash'
        THEN ROUND(s.total * 100)
      END), 0)::bigint AS cash_cents,
      COALESCE(SUM(CASE
        WHEN s.status = 'completed' AND s.payment_method = 'card'
        THEN ROUND(s.total * 100)
      END), 0)::bigint AS card_cents,
      COUNT(*) FILTER (WHERE s.status = 'cancelled')::bigint AS cancelled_orders
    FROM sales s
    WHERE s.created_at >= $1::timestamptz
      AND s.created_at < $2::timestamptz
      ${businessFilter}
  `,
		params,
	);

	const salesByDayPromise = db.query<{
		date_key: string;
		total_sales_cents: string | null;
		orders: string | null;
	}>(
		`
    SELECT
      to_char(date_trunc('day', s.created_at), 'YYYY-MM-DD') AS date_key,
      COALESCE(SUM(ROUND(s.total * 100)), 0)::bigint AS total_sales_cents,
      COUNT(*)::bigint AS orders
    FROM sales s
    WHERE s.created_at >= $1::timestamptz
      AND s.created_at < $2::timestamptz
      AND s.status = 'completed'
      ${businessFilter}
    GROUP BY 1
    ORDER BY 1 ASC
  `,
		params,
	);

	const salesByEmployeePromise = db.query<{
		employee_name: string | null;
		total_sales_cents: string | null;
		orders: string | null;
	}>(
		`
    SELECT
      COALESCE(u.name, '—') AS employee_name,
      COALESCE(SUM(ROUND(s.total * 100)), 0)::bigint AS total_sales_cents,
      COUNT(*)::bigint AS orders
    FROM sales s
    LEFT JOIN users u ON u.id = s.user_id
    WHERE s.created_at >= $1::timestamptz
      AND s.created_at < $2::timestamptz
      AND s.status = 'completed'
      ${businessFilter}
    GROUP BY u.name
    ORDER BY total_sales_cents DESC
    LIMIT 20
  `,
		params,
	);

	const topProductsPromise = db.query<{
		product_id: string | null;
		product_name: string;
		units: string | null;
		revenue_cents: string | null;
	}>(
		`
    SELECT
      si.product_id::text AS product_id,
      si.product_name AS product_name,
      COALESCE(SUM(si.quantity), 0)::float8 AS units,
      COALESCE(SUM(ROUND(si.line_total * 100)), 0)::bigint AS revenue_cents
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    WHERE s.created_at >= $1::timestamptz
      AND s.created_at < $2::timestamptz
      AND s.status = 'completed'
      ${businessFilter}
    GROUP BY si.product_id, si.product_name
    ORDER BY revenue_cents DESC
    LIMIT 10
  `,
		params,
	);

	const [
		totalsResult,
		salesByDayResult,
		salesByEmployeeResult,
		topProductsResult,
	] = await Promise.all([
		totalsPromise,
		salesByDayPromise,
		salesByEmployeePromise,
		topProductsPromise,
	]);

	const totalsRow = totalsResult.rows[0];
	const totalSalesCents = Number(totalsRow?.total_sales_cents ?? 0);
	const orders = Number(totalsRow?.orders ?? 0);
	const totals: DashboardTotals = {
		totalSalesCents,
		orders,
		averageTicketCents: orders > 0 ? Math.round(totalSalesCents / orders) : 0,
		cashCents: Number(totalsRow?.cash_cents ?? 0),
		cardCents: Number(totalsRow?.card_cents ?? 0),
		cancelledOrders: Number(totalsRow?.cancelled_orders ?? 0),
	};

	const dayBuckets = buildEmptyDayBuckets(start, end);
	for (const row of salesByDayResult.rows) {
		const bucket = dayBuckets.get(row.date_key);
		if (bucket) {
			bucket.totalSalesCents = Number(row.total_sales_cents ?? 0);
			bucket.orders = Number(row.orders ?? 0);
		}
	}
	const salesByDay = Array.from(dayBuckets.values());

	const salesByEmployee: DashboardSalesByEmployee[] =
		salesByEmployeeResult.rows.map((row) => {
			const employeeOrders = Number(row.orders ?? 0);
			const employeeTotal = Number(row.total_sales_cents ?? 0);
			return {
				employeeName: row.employee_name ?? "—",
				totalSalesCents: employeeTotal,
				orders: employeeOrders,
				averageTicketCents:
					employeeOrders > 0 ? Math.round(employeeTotal / employeeOrders) : 0,
			};
		});

	const topProducts: DashboardTopProduct[] = topProductsResult.rows.map(
		(row) => ({
			productId: row.product_id,
			productName: row.product_name,
			units: Number(row.units ?? 0),
			revenueCents: Number(row.revenue_cents ?? 0),
		}),
	);

	return {
		range: args.range,
		periodStart: start.toISOString(),
		periodEnd: end.toISOString(),
		totals,
		salesByDay,
		salesByEmployee,
		topProducts,
	};
}
