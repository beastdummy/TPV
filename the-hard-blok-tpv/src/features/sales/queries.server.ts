import { db } from "../../lib/db.server";
import type { SalesCatalog, SalesCategory, SalesProduct } from "./types";

export async function getSalesCatalog(): Promise<SalesCatalog> {
	const [categoriesResult, productsResult] = await Promise.all([
		db.query<SalesCategory>(
			`
        SELECT id, name, description, image_url, sort_order
        FROM categories
        WHERE is_active = true
        ORDER BY sort_order ASC, name ASC
      `,
		),
		db.query<SalesProduct>(
			`
        SELECT
          id,
          name,
          price::float8 AS price,
          image_url,
          category_id,
          sort_order
        FROM products
        WHERE is_active = true
        ORDER BY sort_order ASC, name ASC
      `,
		),
	]);

	return {
		categories: categoriesResult.rows,
		products: productsResult.rows,
	};
}
