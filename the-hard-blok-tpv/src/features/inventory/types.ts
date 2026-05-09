export type Warehouse = {
	id: string;
	name: string;
	is_active: boolean;
};

export type WarehouseStockRow = {
	product_id: string;
	product_name: string;
	warehouse_id: string;
	quantity: number;
};

export const STOCK_MOVEMENT_TYPES = ["in", "out", "adjustment"] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export type StockMovement = {
	id: string;
	product_id: string;
	product_name: string;
	warehouse_id: string;
	movement_type: StockMovementType;
	quantity: number;
	previous_quantity: number;
	new_quantity: number;
	reason: string;
	performed_by_user_id: string;
	performed_by_user_name: string;
	created_at: string;
};

export type InventoryItemRow = {
	id: string;
	product_id: string;
	product_name: string;
	category_name: string;
	warehouse_id: string;
	warehouse_name: string;
	lot_code: string;
	serial_number: string;
	expiry_date: string | null;
	qty_on_hand: number;
};
