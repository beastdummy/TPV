import { getCurrentTenantContext } from "../auth/tenant-guards.server";
import { isBusinessOwnerRole } from "../business-staff/permissions";
import { resolveOperationalWarehouseForBusiness } from "../inventory/operational-warehouse.server";
import {
	getBusinessDetailsForSetup,
	updateBusinessForSetup,
} from "../tenancy/queries.server";
import { logBusinessAuditEvent } from "./audit.server";
import {
	hasInitialStockRecorded,
	listProductStockLinesForSetup,
	markBusinessDetailsConfirmed,
	markBusinessSetupCompleted,
	markCashConfiguredForBusiness,
	markInventoryReviewedForBusiness,
	markStaffStepHandledForBusiness,
} from "./setup-queries.server";
import {
	getBusinessSetupState,
	isSetupReadyForCompletion,
} from "./setup-state.server";
import { auditInventoryReviewed } from "./setup-wizard-actions.server";
import { BUSINESS_AUDIT_ACTIONS } from "./types";

async function requireOwnerBusinessContext() {
	const ctx = await getCurrentTenantContext();

	if (!ctx?.business) {
		throw new Error("TENANT_NOT_FOUND");
	}

	if (!isBusinessOwnerRole(ctx.role)) {
		throw new Error("FORBIDDEN");
	}

	return {
		businessId: ctx.business.businessId,
		userId: ctx.user.id,
		membershipId: ctx.business.membershipId,
	};
}

export async function loadSetupWizardContext() {
	const { businessId } = await requireOwnerBusinessContext();
	const [business, setup, operationalWarehouse, productStockLines] =
		await Promise.all([
			getBusinessDetailsForSetup(businessId),
			getBusinessSetupState(businessId),
			resolveOperationalWarehouseForBusiness(businessId).catch(() => null),
			listProductStockLinesForSetup(),
		]);

	if (!business) {
		throw new Error("TENANT_NOT_FOUND");
	}

	const { loadProductsForAdmin } = await import(
		"../admin/products-access.server"
	);
	const { loadCategoriesForAdmin } = await import(
		"../admin/categories-access.server"
	);
	const { getSuppliers } = await import("../purchases/queries.server");
	const { getWarehouses } = await import("../inventory/queries.server");

	const [categories, products, suppliers, warehouses, staff] =
		await Promise.all([
			setup.hasWarehouse
				? loadCategoriesForAdmin().catch(() => [])
				: Promise.resolve([]),
			setup.hasCategory
				? loadProductsForAdmin().catch(() => [])
				: Promise.resolve([]),
			getSuppliers().catch(() => []),
			setup.hasWarehouse
				? getWarehouses().catch(() => [])
				: Promise.resolve([]),
			setup.cashConfigured
				? import("./setup-staff-wizard.server").then((module) =>
						module.listSetupStaffContext(businessId),
					)
				: Promise.resolve({
						employees: [],
						roles: [],
						hasCustomRoles: false,
					}),
		]);

	return {
		business,
		setup,
		operationalWarehouse: operationalWarehouse
			? { id: operationalWarehouse.id, name: operationalWarehouse.name }
			: null,
		categories: categories.map((category) => ({
			id: category.id,
			name: category.name,
		})),
		products: products.map((product) => ({
			id: product.id,
			name: product.name,
			price: product.price,
		})),
		warehouses: warehouses.map((warehouse) => ({
			id: warehouse.id,
			name: warehouse.name,
			is_default: warehouse.is_default,
			is_operational: operationalWarehouse?.id === warehouse.id,
		})),
		staff,
		suppliers: suppliers.map((supplier) => ({
			id: supplier.id,
			name: supplier.name,
		})),
		productStockLines,
	};
}

export type ConfirmBusinessSetupInput = {
	name: string;
	legal_name?: string;
	timezone?: string;
};

export async function confirmBusinessSetupDetails(
	input: ConfirmBusinessSetupInput,
) {
	const { businessId, userId } = await requireOwnerBusinessContext();

	await updateBusinessForSetup({
		businessId,
		name: input.name.trim(),
		legalName: input.legal_name?.trim() ?? "",
		timezone: input.timezone?.trim() || "Europe/Madrid",
	});

	await markBusinessDetailsConfirmed(businessId);

	try {
		await logBusinessAuditEvent({
			businessId,
			actorUserId: userId,
			action: BUSINESS_AUDIT_ACTIONS.BUSINESS_CREATED,
			entityType: "business",
			entityId: businessId,
			metadata: { name: input.name.trim() },
		});
	} catch {
		// La auditoría no debe bloquear el onboarding si la migración aún no está aplicada.
	}

	const [business, setup] = await Promise.all([
		getBusinessDetailsForSetup(businessId),
		getBusinessSetupState(businessId),
	]);

	if (!business) {
		throw new Error("TENANT_NOT_FOUND");
	}

	return { ok: true as const, business, setup };
}

export async function markInventoryReviewedStep() {
	const { businessId } = await requireOwnerBusinessContext();

	const hasStock = await hasInitialStockRecorded();
	if (!hasStock) {
		throw new Error(
			"Registra al menos una compra o entrada inicial de stock antes de continuar.",
		);
	}

	await markInventoryReviewedForBusiness(businessId);
	await auditInventoryReviewed();
	const setup = await getBusinessSetupState(businessId);

	if (!setup.inventoryReviewed) {
		throw new Error(
			"No se pudo guardar la revisión del inventario. Inténtalo de nuevo.",
		);
	}

	return {
		ok: true as const,
		setup,
		productStockLines: await listProductStockLinesForSetup(),
	};
}

export async function markCashConfiguredStep(openingFloat: number) {
	const { businessId } = await requireOwnerBusinessContext();
	if (openingFloat < 0) {
		throw new Error("El fondo inicial no puede ser negativo.");
	}
	await markCashConfiguredForBusiness(businessId, openingFloat);
	const setup = await getBusinessSetupState(businessId);
	return { ok: true as const, setup };
}

export async function setupOpenCashSessionStep(openingFloat: number) {
	const { businessId } = await requireOwnerBusinessContext();
	const setup = await getBusinessSetupState(businessId);

	if (!setup.hasInitialStock) {
		throw new Error(
			"Registra al menos una compra o entrada inicial de stock antes de abrir la caja.",
		);
	}

	if (!setup.inventoryReviewed) {
		throw new Error(
			"Revisa el inventario antes de abrir la caja en la configuración inicial.",
		);
	}

	if (!setup.cashConfigured) {
		throw new Error("Configura el fondo de caja antes de abrir la sesión.");
	}

	const { setupOpenCashSession } = await import(
		"./setup-wizard-actions.server"
	);
	await setupOpenCashSession(businessId, openingFloat);

	return {
		ok: true as const,
		setup: await getBusinessSetupState(businessId),
	};
}

export async function completeSetupStaffStep() {
	const { businessId } = await requireOwnerBusinessContext();
	await markStaffStepHandledForBusiness(businessId);
	const [setup, staff] = await Promise.all([
		getBusinessSetupState(businessId),
		import("./setup-staff-wizard.server").then((module) =>
			module.listSetupStaffContext(businessId),
		),
	]);
	return { ok: true as const, setup, staff };
}

export async function finishBusinessSetup() {
	const { businessId, userId } = await requireOwnerBusinessContext();
	const setup = await getBusinessSetupState(businessId);

	if (
		!isSetupReadyForCompletion({
			businessDetailsConfirmed: setup.businessDetailsConfirmed,
			hasWarehouse: setup.hasWarehouse,
			hasCategory: setup.hasCategory,
			hasProduct: setup.hasProduct,
			hasInitialStock: setup.hasInitialStock,
			inventoryReviewed: setup.inventoryReviewed,
			cashConfigured: setup.cashConfigured,
			staffStepHandled: setup.staffStepHandled,
			hasOpenCashSession: setup.hasOpenCashSession,
			setupCompleted: false,
		})
	) {
		throw new Error("SETUP_INCOMPLETE");
	}

	await markBusinessSetupCompleted(businessId);

	await logBusinessAuditEvent({
		businessId,
		actorUserId: userId,
		action: BUSINESS_AUDIT_ACTIONS.SETUP_COMPLETED,
		entityType: "business",
		entityId: businessId,
	});

	return { ok: true as const, redirectTo: "/sales" as const };
}

export async function getBusinessSetupStateForCurrentTenant() {
	const ctx = await getCurrentTenantContext();

	if (!ctx?.business) {
		return null;
	}

	return await getBusinessSetupState(ctx.business.businessId);
}
