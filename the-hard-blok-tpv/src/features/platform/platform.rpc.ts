import { createServerFn } from "@tanstack/react-start";

import type { PlatformDashboardData } from "./types";

export const ensurePlatformAdminFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const { requirePlatformAdmin } = await import("./platform-guards.server");
		return await requirePlatformAdmin();
	},
);

export const getPlatformDashboardFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<PlatformDashboardData> => {
		const { requirePlatformAdmin } = await import("./platform-guards.server");
		await requirePlatformAdmin();

		const { getPlatformDashboardData } = await import(
			"./platform-dashboard-queries.server"
		);
		return await getPlatformDashboardData();
	},
);
