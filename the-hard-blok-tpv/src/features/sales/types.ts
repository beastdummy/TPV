export type SalesCategory = {
	id: string;
	name: string;
	description: string;
	sort_order: number;
};

export type SalesProduct = {
	id: string;
	name: string;
	price: number;
	image_url: string;
	category_id: string;
	sort_order: number;
};

export type SalesCatalog = {
	categories: SalesCategory[];
	products: SalesProduct[];
};
