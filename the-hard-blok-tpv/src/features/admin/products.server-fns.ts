import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
	loadCategoriesForProductsPage,
	loadProductsForAdmin,
	removeProductForAdmin,
} from "./products-access.server";

const idSchema = z.object({
	id: z.string().trim().min(1),
});

/** Listado de productos — tenant-aware (ruta /admin/products). */
export const getProductsForAdminFn = createServerFn().handler(async () => {
	return await loadProductsForAdmin();
});

/** Categorías para el filtro de la página de productos — tenant-aware. */
export const getCategoriesForProductsPageFn = createServerFn().handler(
	async () => {
		return await loadCategoriesForProductsPage();
	},
);

export type DeleteProductForAdminInput = {
	id: string;
};

/** Borrado de producto — tenant-aware (ruta /admin/products). */
export const deleteProductForAdminFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => idSchema.parse(data))
	.handler(async ({ data }) => {
		return await removeProductForAdmin(data.id);
	});
