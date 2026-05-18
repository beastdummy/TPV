export type Warehouse = {
	id: string;
	name: string;
	is_active: boolean;
	is_default?: boolean;
};

export type WarehouseStockRow = {
	product_id: string;
	product_name: string;
	warehouse_id: string;
	quantity: number;
};

import type { StockMovementType } from "./stock-movement-types";

export {
	LEGACY_STOCK_MOVEMENT_TYPES,
	type LegacyStockMovementType,
	STOCK_MOVEMENT_TYPES,
	type StockMovementType,
} from "./stock-movement-types";

export type ProductStockRow = {
	product_id: string;
	product_name: string;
	warehouse_id: string;
	warehouse_name: string;
	quantity: number;
	minimum_quantity: number;
	reorder_quantity: number;
};

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
