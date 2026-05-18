import { loadCategoriesForAdmin } from "./categories-access.server";
import { loadProductsForAdmin } from "./products-access.server";

/** Resumen de catálogo para /admin — tenant-aware (products + categories). */
export async function loadCatalogDashboardForAdmin() {
	const [categories, products] = await Promise.all([
		loadCategoriesForAdmin(),
		loadProductsForAdmin(),
	]);

	return { categories, products };
}
