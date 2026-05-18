import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { CategoryForAdminInput } from "../admin/categories-access.server";
import type { CreateProductForAdminInput } from "../admin/products-access.server";
import type { SetupCreateInitialStockInput } from "./setup-wizard-actions.server";

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

async function requireBusinessIdFromContext() {
	const { getCurrentTenantContext } = await import(
		"../auth/tenant-guards.server"
	);
	const ctx = await getCurrentTenantContext();
	if (!ctx?.business) {
		throw new Error("TENANT_NOT_FOUND");
	}
	return ctx.business.businessId;
}

export const setupCreateWarehouseFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => data as { id: string; name: string })
	.handler(async ({ data }) => {
		const { setupCreateWarehouse } = await import(
			"./setup-wizard-actions.server"
		);
		const businessId = await requireBusinessIdFromContext();
		return await setupCreateWarehouse(
			{
				id: data.id,
				name: data.name,
				is_active: true,
			},
			businessId,
		);
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
		const businessId = await requireBusinessIdFromContext();
		return await setupCreateProduct(data, businessId);
	});

const initialStockSchema = z.object({
	product_id: z.string().trim().min(1),
	quantity: z.number().positive(),
	unit_cost: z.number().min(0).optional(),
	supplier_id: z.string().trim().min(1).nullable().optional(),
	reason: z.enum(["initial_purchase", "initial_stock"]).optional(),
	notes: z.string().trim().max(500).optional(),
});

export const setupCreateInitialStockFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => initialStockSchema.parse(data))
	.handler(async ({ data }) => {
		const { setupCreateInitialStock } = await import(
			"./setup-wizard-actions.server"
		);
		const businessId = await requireBusinessIdFromContext();
		return await setupCreateInitialStock(
			data as SetupCreateInitialStockInput,
			businessId,
		);
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
		const businessId = await requireBusinessIdFromContext();
		return await setupOpenCashSession(businessId, data.opening_float ?? 0);
	});

export const markInventoryReviewedStepFn = createServerFn({
	method: "POST",
}).handler(async () => {
	const { markInventoryReviewedStep } = await import("./setup-access.server");
	return await markInventoryReviewedStep();
});

const setupEmployeeSchema = z.object({
	name: z.string().trim().min(1).max(120),
	email: z.string().trim().email().max(200),
	role_slug: z.string().trim().min(1).max(80),
	pin: z
		.string()
		.trim()
		.regex(/^\d{4,8}$/),
});

export const setupCreateEmployeeFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => setupEmployeeSchema.parse(data))
	.handler(async ({ data }) => {
		const { setupCreateEmployee } = await import("./setup-staff-wizard.server");
		const businessId = await requireBusinessIdFromContext();
		const result = await setupCreateEmployee(businessId, data);
		const staff = await import("./setup-staff-wizard.server").then((module) =>
			module.listSetupStaffContext(businessId),
		);
		return { ...result, staff };
	});

export const setupCreateQuickRoleFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => {
		const parsed = z
			.object({
				preset: z.enum(["cajero", "camarero", "encargado"]),
			})
			.parse(data);
		return parsed;
	})
	.handler(async ({ data }) => {
		const { setupCreateQuickRole } = await import(
			"./setup-staff-wizard.server"
		);
		const businessId = await requireBusinessIdFromContext();
		const result = await setupCreateQuickRole(businessId, data.preset);
		const staff = await import("./setup-staff-wizard.server").then((module) =>
			module.listSetupStaffContext(businessId),
		);
		return { ...result, staff };
	});

export const setupSetOperationalWarehouseFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => {
		const parsed = z
			.object({ warehouse_id: z.string().trim().min(1) })
			.parse(data);
		return parsed;
	})
	.handler(async ({ data }) => {
		const { setupSetOperationalWarehouse } = await import(
			"./setup-wizard-actions.server"
		);
		const businessId = await requireBusinessIdFromContext();
		return await setupSetOperationalWarehouse(businessId, data.warehouse_id);
	});

export const completeSetupStaffStepFn = createServerFn({
	method: "POST",
}).handler(async () => {
	const { completeSetupStaffStep } = await import("./setup-access.server");
	return await completeSetupStaffStep();
});

export const markCashConfiguredStepFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => {
		const parsed = z
			.object({ opening_float: z.number().min(0) })
			.parse(data ?? {});
		return parsed;
	})
	.handler(async ({ data }) => {
		const { markCashConfiguredStep } = await import("./setup-access.server");
		return await markCashConfiguredStep(data.opening_float);
	});
