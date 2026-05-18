export const SETUP_STEPS = [
	"confirm_business",
	"warehouse",
	"category",
	"product",
	"initial_stock",
	"review_inventory",
	"configure_cash",
	"open_cash",
	"complete",
] as const;

export type SetupStep = (typeof SETUP_STEPS)[number];

export type BusinessSetupState = {
	hasWarehouse: boolean;
	hasCategory: boolean;
	hasProduct: boolean;
	hasInitialStock: boolean;
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
	CASH_SESSION_OPENED: "cash_session.opened",
	SALE_FINALIZED: "sale.finalized",
	SETUP_COMPLETED: "setup.completed",
} as const;

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
