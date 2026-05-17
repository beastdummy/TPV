import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { CategoryForAdminInput } from "./categories-access.server";
import {
	createCategoryForAdmin,
	loadCategoriesForAdmin,
	removeCategoryForAdmin,
	updateCategoryForAdmin,
} from "./categories-access.server";

const categorySchema = z.object({
	id: z.string().trim().min(1).max(80),
	name: z.string().trim().min(1).max(120),
	description: z.string().trim().max(500),
	sort_order: z.number().int().min(0),
	is_active: z.boolean(),
});

const idSchema = z.object({
	id: z.string().trim().min(1),
});

/** Listado de categorías — tenant-aware (ruta /admin/categories). */
export const getCategoriesForAdminFn = createServerFn().handler(async () => {
	return await loadCategoriesForAdmin();
});

/** Crear categoría — tenant-aware. */
export const createCategoryForAdminFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => categorySchema.parse(data))
	.handler(async ({ data }) => {
		return await createCategoryForAdmin(data as CategoryForAdminInput);
	});

/** Actualizar categoría — tenant-aware. */
export const updateCategoryForAdminFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => categorySchema.parse(data))
	.handler(async ({ data }) => {
		return await updateCategoryForAdmin(data as CategoryForAdminInput);
	});

export type DeleteCategoryForAdminInput = {
	id: string;
};

/** Borrar categoría (si vacía) — tenant-aware. */
export const deleteCategoryForAdminFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => idSchema.parse(data))
	.handler(async ({ data }) => {
		return await removeCategoryForAdmin(data.id);
	});
