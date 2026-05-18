import { ensureCatalogManagementBusinessRole } from "./products-access.server";

export type CategoryForAdminInput = {
	id: string;
	name: string;
	description: string;
	sort_order: number;
	is_active: boolean;
};

export async function loadCategoriesForAdmin() {
	await ensureCatalogManagementBusinessRole();
	const { getCategories } = await import("./queries.server");
	return await getCategories();
}

export async function createCategoryForAdmin(data: CategoryForAdminInput) {
	await ensureCatalogManagementBusinessRole();
	const { createCategory } = await import("./queries.server");
	await createCategory(data);
	return { ok: true as const };
}

export async function updateCategoryForAdmin(data: CategoryForAdminInput) {
	await ensureCatalogManagementBusinessRole();
	const { updateCategory } = await import("./queries.server");
	await updateCategory(data);
	return { ok: true as const };
}

export async function removeCategoryForAdmin(categoryId: string) {
	await ensureCatalogManagementBusinessRole();
	const { deleteCategoryIfEmpty } = await import("./queries.server");
	return await deleteCategoryIfEmpty(categoryId);
}
