import { createServerFn } from "@tanstack/react-start";

import { ensurePosOperationRole } from "../auth/auth.rpc";
import { db } from "../../lib/db.server";

type OpenDrawerResult = {
	ok: true;
	openedAt: string;
	message: string;
};

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

export const getSalesCatalogFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<SalesCatalog> => {
		await ensurePosOperationRole();

		const [categoriesResult, productsResult] = await Promise.all([
			db.query<SalesCategory>(
				`
        SELECT id, name, description, sort_order
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
	},
);

export const openCashDrawerFn = createServerFn({ method: "POST" }).handler(
	async (): Promise<OpenDrawerResult> => {
		await ensurePosOperationRole();

		// Punto backend para integrar hardware real de cajón.
		// Por ahora devolvemos confirmación para que la acción del TPV quede operativa.
		return {
			ok: true,
			openedAt: new Date().toISOString(),
			message: "Cajón abierto (simulado).",
		};
	},
);
