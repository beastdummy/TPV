export const SETUP_STEPS = [
	"confirm_business",
	"warehouse",
	"category",
	"product",
	"initial_stock",
	"review_inventory",
	"configure_cash",
	"staff",
	"open_cash",
	"complete",
] as const;

export type SetupStep = (typeof SETUP_STEPS)[number];

export type BusinessSetupState = {
	businessDetailsConfirmed: boolean;
	hasWarehouse: boolean;
	hasCategory: boolean;
	hasProduct: boolean;
	hasInitialStock: boolean;
	inventoryReviewed: boolean;
	cashConfigured: boolean;
	staffStepHandled: boolean;
	hasCashSession: boolean;
	hasOpenCashSession: boolean;
	canAccessSales: boolean;
	setupCompleted: boolean;
	currentStep: SetupStep;
	completedSteps: SetupStep[];
};

export type BusinessModuleKey =
	| "dashboard"
	| "sales"
	| "products"
	| "categories"
	| "inventory"
	| "warehouses"
	| "purchases"
	| "employees"
	| "roles"
	| "audit"
	| "settings";

export const BUSINESS_AUDIT_ACTIONS = {
	BUSINESS_CREATED: "business.created",
	OWNER_REGISTERED: "owner.registered",
	WAREHOUSE_CREATED: "warehouse.created",
	CATEGORY_CREATED: "category.created",
	PRODUCT_CREATED: "product.created",
	INITIAL_STOCK_RECORDED: "stock.initial_recorded",
	INITIAL_STOCK_CREATED: "inventory.initial_stock_created",
	INITIAL_PURCHASE_CREATED: "purchase.initial_created",
	INVENTORY_REVIEWED: "inventory.reviewed",
	CASH_SESSION_OPENED: "cash_session.opened",
	SALE_FINALIZED: "sale.finalized",
	SETUP_COMPLETED: "setup.completed",
} as const;

export type SetupProductStockLine = {
	product_id: string;
	product_name: string;
	warehouse_id: string;
	warehouse_name: string;
	quantity: number;
};

export type SetupInitialStockReason = "initial_purchase" | "initial_stock";

export type BusinessAuditAction =
	(typeof BUSINESS_AUDIT_ACTIONS)[keyof typeof BUSINESS_AUDIT_ACTIONS];

export type BusinessAuditLogRow = {
	id: string;
	action: string;
	entity_type: string | null;
	entity_id: string | null;
	metadata: Record<string, unknown>;
	created_at: string;
	actor_user_name: string | null;
};
