import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
	DASHBOARD_RANGE_VALUES,
	type DashboardData,
	type DashboardRange,
	DEFAULT_DASHBOARD_RANGE,
} from "./types";

const dashboardInputSchema = z.object({
	range: z.enum(DASHBOARD_RANGE_VALUES).optional(),
});

/**
 * Sólo dueños y managers pueden ver el dashboard ejecutivo.
 * Personal de caja no debe ver KPIs agregados de negocio.
 */
async function ensureDashboardAccess() {
	const { getAppUserFn } = await import("../auth/auth.rpc");
	const user = await getAppUserFn();

	if (!user) {
		throw new Error("UNAUTHORIZED");
	}

	if (user.role !== "owner" && user.role !== "manager") {
		throw new Error("FORBIDDEN");
	}

	return user;
}

export const getDashboardFn = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => dashboardInputSchema.parse(data ?? {}))
	.handler(async ({ data }): Promise<DashboardData> => {
		await ensureDashboardAccess();

		const range: DashboardRange = data.range ?? DEFAULT_DASHBOARD_RANGE;
		const { getDashboardData } = await import("./queries.server");
		return await getDashboardData({ range });
	});
