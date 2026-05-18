import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { CategoryForAdminInput } from "../admin/categories-access.server";
import type { CreateProductForAdminInput } from "../admin/products-access.server";
import type { CreatePurchaseReceiptForAdminInput } from "../admin/purchases-write-access.server";

const confirmBusinessSchema = z.object({
	name: z.string().trim().min(2).max(120),
	legal_name: z.string().trim().max(200).optional(),
	timezone: z.string().trim().max(64).optional(),
});

export const loadSetupWizardContextFn = createServerFn({
	method: "GET",
}).handler(async () => {
	const { loadSetupWizardContext } = await import("./setup-access.server");
	return await loadSetupWizardContext();
});

export const getBusinessSetupStateFn = createServerFn({
	method: "GET",
}).handler(async () => {
	const { getBusinessSetupStateForCurrentTenant } = await import(
		"./setup-access.server"
	);
	return await getBusinessSetupStateForCurrentTenant();
});

export const confirmBusinessSetupDetailsFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => confirmBusinessSchema.parse(data))
	.handler(async ({ data }) => {
		const { confirmBusinessSetupDetails } = await import(
			"./setup-access.server"
		);
		return await confirmBusinessSetupDetails(data);
	});

export const finishBusinessSetupFn = createServerFn({ method: "POST" }).handler(
	async () => {
		const { finishBusinessSetup } = await import("./setup-access.server");
		return await finishBusinessSetup();
	},
);

export const listBusinessAuditLogsFn = createServerFn({
	method: "GET",
}).handler(async () => {
	const { getCurrentTenantContext } = await import(
		"../auth/tenant-guards.server"
	);
	const { listBusinessAuditLogs } = await import("./audit.server");
	const ctx = await getCurrentTenantContext();

	if (!ctx?.business) {
		return [];
	}

	return await listBusinessAuditLogs(ctx.business.businessId);
});

export const setupCreateWarehouseFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => data as { id: string; name: string })
	.handler(async ({ data }) => {
		const { setupCreateWarehouse } = await import(
			"./setup-wizard-actions.server"
		);
		return await setupCreateWarehouse({
			id: data.id,
			name: data.name,
			is_active: true,
		});
	});

export const setupCreateCategoryFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => data as CategoryForAdminInput)
	.handler(async ({ data }) => {
		const { setupCreateCategory } = await import(
			"./setup-wizard-actions.server"
		);
		return await setupCreateCategory(data);
	});

export const setupCreateProductFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => data as CreateProductForAdminInput)
	.handler(async ({ data }) => {
		const { setupCreateProduct } = await import(
			"./setup-wizard-actions.server"
		);
		return await setupCreateProduct(data);
	});

export const setupCreateInitialStockFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => data as CreatePurchaseReceiptForAdminInput)
	.handler(async ({ data }) => {
		const { setupCreateInitialStock } = await import(
			"./setup-wizard-actions.server"
		);
		return await setupCreateInitialStock(data);
	});

export const setupCreateDefaultSupplierFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => {
		const parsed = z.object({ name: z.string().optional() }).parse(data);
		return parsed;
	})
	.handler(async ({ data }) => {
		const { setupCreateDefaultSupplier } = await import(
			"./setup-wizard-actions.server"
		);
		return await setupCreateDefaultSupplier(data.name ?? "Proveedor inicial");
	});

export const setupOpenCashSessionFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => {
		const parsed = z
			.object({ opening_float: z.number().min(0).optional() })
			.parse(data ?? {});
		return parsed;
	})
	.handler(async ({ data }) => {
		const { setupOpenCashSession } = await import(
			"./setup-wizard-actions.server"
		);
		return await setupOpenCashSession(data.opening_float ?? 0);
	});
