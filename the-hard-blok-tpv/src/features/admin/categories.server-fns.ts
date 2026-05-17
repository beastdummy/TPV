import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { CategoryForAdminInput } from "./categories-access.server";
import {
	createCategoryForAdmin,
	loadCategoriesForAdmin,
	removeCategoryForAdmin,
	updateCategoryForAdmin,
} from "./categories-access.server";
import {
	CATEGORY_IMAGE_ERROR_CODES,
	CategoryImageError,
} from "./category-image/category-image.errors";
import {
	uploadCategoryImageFileForAdmin,
	uploadCategoryImageFromRemoteUrlForAdmin,
} from "./category-image/category-image-access.server";

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

const remoteImageSchema = z.object({
	categoryId: z.string().trim().min(1).max(80),
	remoteUrl: z.string().trim().url().max(2048),
});

async function readUploadFromFormData(formData: FormData) {
	const categoryId = String(formData.get("categoryId") ?? "").trim();
	const file = formData.get("file");

	if (!(file instanceof File)) {
		throw new CategoryImageError(
			CATEGORY_IMAGE_ERROR_CODES.MISSING_FILE,
			"Falta el archivo de imagen.",
		);
	}

	return {
		categoryId,
		buffer: Buffer.from(await file.arrayBuffer()),
		mimeType: file.type || null,
	};
}

/** Sube imagen de categoría (multipart) — tenant-aware. */
export const uploadCategoryImageFileForAdminFn = createServerFn({
	method: "POST",
}).handler(async ({ data }) => {
	if (!(data instanceof FormData)) {
		throw new CategoryImageError(
			CATEGORY_IMAGE_ERROR_CODES.MISSING_FILE,
			"Se esperaba FormData con categoryId y file.",
		);
	}

	const upload = await readUploadFromFormData(data);
	return await uploadCategoryImageFileForAdmin(upload);
});

/** Importa imagen desde URL remota — tenant-aware. */
export const uploadCategoryImageFromRemoteUrlForAdminFn = createServerFn({
	method: "POST",
})
	.inputValidator((payload: unknown) => remoteImageSchema.parse(payload))
	.handler(async ({ data }) => {
		return await uploadCategoryImageFromRemoteUrlForAdmin(data);
	});
