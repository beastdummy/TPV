import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type CreateCategoryInput = {
	id: string;
	name: string;
	description: string;
	sort_order: number;
	is_active: boolean;
};

export type UpdateCategoryInput = {
	id: string;
	name: string;
	description: string;
	sort_order: number;
	is_active: boolean;
};

export type DeleteCategoryInput = {
	id: string;
};

export type CreateProductInput = {
	name: string;
	description: string;
	price: number;
	category_id: string;
	image_url: string;
	tax_rate: number;
	warehouse: string;
	sort_order: number;
};

const categorySchema = z.object({
	id: z.string().trim().min(1).max(80),
	name: z.string().trim().min(1).max(120),
	description: z.string().trim().max(500),
	sort_order: z.number().int().min(0),
	is_active: z.boolean(),
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

const idSchema = z.object({
	id: z.string().trim().min(1),
});

export const getCategoriesFn = createServerFn().handler(async () => {
	const { ensureCatalogManagementRole } = await import("../auth/auth.rpc");
	await ensureCatalogManagementRole();
	const { getCategories } = await import("./queries.server");
	return await getCategories();
});

export const getProductsFn = createServerFn().handler(async () => {
	const { ensureCatalogManagementRole } = await import("../auth/auth.rpc");
	await ensureCatalogManagementRole();
	const { getProducts } = await import("./queries.server");
	return await getProducts();
});

export const createCategoryFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => categorySchema.parse(data))
	.handler(async ({ data }) => {
		const { ensureCatalogManagementRole } = await import("../auth/auth.rpc");
		await ensureCatalogManagementRole();
		const { createCategory } = await import("./queries.server");
		await createCategory(data);
		return { ok: true };
	});

export const updateCategoryFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => categorySchema.parse(data))
	.handler(async ({ data }) => {
		const { ensureCatalogManagementRole } = await import("../auth/auth.rpc");
		await ensureCatalogManagementRole();
		const { updateCategory } = await import("./queries.server");
		await updateCategory(data);
		return { ok: true };
	});

export const deleteCategoryFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => idSchema.parse(data))
	.handler(async ({ data }) => {
		const { ensureCatalogManagementRole } = await import("../auth/auth.rpc");
		await ensureCatalogManagementRole();
		const { deleteCategoryIfEmpty } = await import("./queries.server");
		return await deleteCategoryIfEmpty(data.id);
	});

export const createProductFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => createProductSchema.parse(data))
	.handler(async ({ data }) => {
		const { ensureCatalogManagementRole } = await import("../auth/auth.rpc");
		await ensureCatalogManagementRole();
		const { createProduct } = await import("./queries.server");
		await createProduct(data);
		return { ok: true };
	});

export type DeleteProductInput = {
	id: string;
};

export type GetProductByIdInput = {
	id: string;
};

export const deleteProductFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => idSchema.parse(data))
	.handler(async ({ data }) => {
		const { ensureCatalogManagementRole } = await import("../auth/auth.rpc");
		await ensureCatalogManagementRole();
		const { deleteProduct } = await import("./queries.server");
		return await deleteProduct(data.id);
	});

export type UpdateProductInput = {
	id: string;
	name: string;
	description: string;
	price: number;
	category_id: string;
	image_url: string;
	tax_rate: number;
	warehouse: string;
	sort_order: number;
	is_active: boolean;
};

export const getProductByIdFn = createServerFn()
	.inputValidator((data: unknown) => idSchema.parse(data))
	.handler(async ({ data }) => {
		const { ensureCatalogManagementRole } = await import("../auth/auth.rpc");
		await ensureCatalogManagementRole();
		const { getProductById } = await import("./queries.server");
		return await getProductById(data.id);
	});

export const updateProductFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => updateProductSchema.parse(data))
	.handler(async ({ data }) => {
		const { ensureCatalogManagementRole } = await import("../auth/auth.rpc");
		await ensureCatalogManagementRole();
		const { updateProduct } = await import("./queries.server");
		await updateProduct(data);
		return { ok: true };
	});
