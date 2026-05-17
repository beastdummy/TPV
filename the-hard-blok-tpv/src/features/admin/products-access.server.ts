import { requireBusinessRole } from "../auth/tenant-guards.server";
import { CATALOG_MANAGEMENT_ROLES } from "../auth/types";

export async function ensureCatalogManagementBusinessRole() {
	return await requireBusinessRole(CATALOG_MANAGEMENT_ROLES);
}

export async function loadProductsForAdmin() {
	await ensureCatalogManagementBusinessRole();
	const { getProducts } = await import("./queries.server");
	return await getProducts();
}

export async function loadCategoriesForProductsPage() {
	await ensureCatalogManagementBusinessRole();
	const { getCategories } = await import("./queries.server");
	return await getCategories();
}

export async function removeProductForAdmin(productId: string) {
	await ensureCatalogManagementBusinessRole();
	const { deleteProduct } = await import("./queries.server");
	return await deleteProduct(productId);
}

export type CreateProductForAdminInput = {
	name: string;
	description: string;
	price: number;
	category_id: string;
	image_url: string;
	tax_rate: number;
	warehouse: string;
	sort_order: number;
};

export type UpdateProductForAdminInput = CreateProductForAdminInput & {
	id: string;
	is_active: boolean;
};

export async function createProductForAdmin(data: CreateProductForAdminInput) {
	await ensureCatalogManagementBusinessRole();
	const { createProduct } = await import("./queries.server");
	await createProduct(data);
	return { ok: true as const };
}

export async function loadProductByIdForAdmin(productId: string) {
	await ensureCatalogManagementBusinessRole();
	const { getProductById } = await import("./queries.server");
	return await getProductById(productId);
}

export async function updateProductForAdmin(data: UpdateProductForAdminInput) {
	await ensureCatalogManagementBusinessRole();
	const { updateProduct } = await import("./queries.server");
	await updateProduct(data);
	return { ok: true as const };
}
