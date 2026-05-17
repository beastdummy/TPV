import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type {
	CreateProductForAdminInput,
	UpdateProductForAdminInput,
} from "./products-access.server";
import {
	createProductForAdmin,
	loadCategoriesForProductsPage,
	loadProductByIdForAdmin,
	loadProductsForAdmin,
	removeProductForAdmin,
	updateProductForAdmin,
} from "./products-access.server";

const idSchema = z.object({
	id: z.string().trim().min(1),
});

const createProductSchema = z.object({
	name: z.string().trim().min(1).max(120),
	description: z.string().trim().max(500),
	price: z.number().min(0),
	category_id: z.string().trim().min(1).max(80),
	image_url: z.string().trim().max(500),
	tax_rate: z.number().min(0).max(100),
	warehouse: z.string().trim().min(1).max(120),
	sort_order: z.number().int().min(0),
});

const updateProductSchema = createProductSchema.extend({
	id: z.string().trim().min(1),
	is_active: z.boolean(),
});

/** Listado de productos — tenant-aware (ruta /admin/products). */
export const getProductsForAdminFn = createServerFn().handler(async () => {
	return await loadProductsForAdmin();
});

/** Categorías para formularios/listado de productos — tenant-aware. */
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

/** Crear producto — tenant-aware (ruta /admin/products/create). */
export const createProductForAdminFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => createProductSchema.parse(data))
	.handler(async ({ data }) => {
		return await createProductForAdmin(data as CreateProductForAdminInput);
	});

/** Detalle de producto — tenant-aware (ruta /admin/products/$id/edit). */
export const getProductByIdForAdminFn = createServerFn()
	.inputValidator((data: unknown) => idSchema.parse(data))
	.handler(async ({ data }) => {
		return await loadProductByIdForAdmin(data.id);
	});

/** Actualizar producto — tenant-aware (ruta /admin/products/$id/edit). */
export const updateProductForAdminFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => updateProductSchema.parse(data))
	.handler(async ({ data }) => {
		return await updateProductForAdmin(data as UpdateProductForAdminInput);
	});
