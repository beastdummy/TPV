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
