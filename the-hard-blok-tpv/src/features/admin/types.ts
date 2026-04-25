export type Category = {
	id: string;
	name: string;
	description: string;
	sort_order: number;
	is_active: boolean;
};

export type Product = {
	id: string;
	name: string;
	description: string;
	price: number;
	category_id: string;
	category_name: string;
	image_url: string;
	tax_rate: number;
	warehouse: string;
	sort_order: number;
	is_active: boolean;
};
