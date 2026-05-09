export type Supplier = {
	id: string;
	name: string;
	tax_id: string;
	email: string;
	phone: string;
	is_active: boolean;
};

export type PurchaseReceiptListItem = {
	id: string;
	supplier_name: string;
	warehouse_name: string;
	total_amount: number;
	created_at: string;
	created_by_user_name: string;
};
