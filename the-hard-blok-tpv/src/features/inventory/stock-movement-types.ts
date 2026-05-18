export const STOCK_MOVEMENT_TYPES = [
	"in",
	"out",
	"sale",
	"transfer_in",
	"transfer_out",
	"adjustment_in",
	"adjustment_out",
	"adjustment_set",
	"purchase",
	"adjustment",
] as const;

export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export const LEGACY_STOCK_MOVEMENT_TYPES = ["in", "out", "adjustment"] as const;

export type LegacyStockMovementType =
	(typeof LEGACY_STOCK_MOVEMENT_TYPES)[number];

export const STOCK_ADJUSTMENT_REASON_CODES = [
	"breakage",
	"waste",
	"expired",
	"theft_loss",
	"internal_consumption",
	"recount_correction",
	"supplier_correction",
	"other",
] as const;

export type StockAdjustmentReasonCode =
	(typeof STOCK_ADJUSTMENT_REASON_CODES)[number];

export const INVENTORY_AUDIT_ACTIONS = {
	NEGATIVE_STOCK_SALE: "inventory.negative_stock_sale",
	TRANSFER: "inventory.transfer",
	ADJUSTMENT: "inventory.adjustment",
	REPLENISHMENT_GENERATED: "inventory.replenishment_generated",
} as const;

export type NegativeStockSaleItem = {
	product_id: string;
	product_name: string;
	warehouse_id: string;
	before_quantity: number;
	sold_quantity: number;
	after_quantity: number;
};

export type ReplenishmentStatus = "OK" | "Bajo" | "Negativo" | "Urgente";

export type ReplenishmentRow = {
	product_id: string;
	product_name: string;
	warehouse_id: string;
	warehouse_name: string;
	current_quantity: number;
	sold_today: number;
	minimum_quantity: number;
	reorder_quantity: number;
	shortage: number;
	suggested_reorder: number;
	status: ReplenishmentStatus;
};
