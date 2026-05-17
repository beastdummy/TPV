import { ensureCatalogManagementBusinessRole } from "../products-access.server";
import { getCategoryById, updateCategoryImageUrl } from "../queries.server";
import {
	CATEGORY_IMAGE_ERROR_CODES,
	CategoryImageError,
} from "./category-image.errors";
import {
	assertValidCategoryId,
	resolveCategoryImageStorage,
	saveCategoryImageFromRemoteUrl,
	saveCategoryImageFromUpload,
} from "./category-image.server";

function getProjectRoot() {
	return process.cwd();
}

export async function resolveCatalogTenantBusinessId(): Promise<string> {
	const ctx = await ensureCatalogManagementBusinessRole();
	const businessId = ctx.business?.businessId;

	if (!businessId) {
		throw new CategoryImageError(
			CATEGORY_IMAGE_ERROR_CODES.TENANT_NOT_FOUND,
			"No hay negocio activo para este usuario.",
		);
	}

	return businessId;
}

async function assertCategoryExists(categoryId: string) {
	const category = await getCategoryById(categoryId);

	if (!category) {
		throw new CategoryImageError(
			CATEGORY_IMAGE_ERROR_CODES.CATEGORY_NOT_FOUND,
			"Categoría no encontrada.",
		);
	}

	return category;
}

export async function uploadCategoryImageFileForAdmin(params: {
	categoryId: string;
	buffer: Buffer;
	mimeType: string | null;
}) {
	const businessId = await resolveCatalogTenantBusinessId();
	const categoryId = assertValidCategoryId(params.categoryId);
	await assertCategoryExists(categoryId);

	const storage = await saveCategoryImageFromUpload({
		projectRoot: getProjectRoot(),
		businessId,
		categoryId,
		buffer: params.buffer,
		mimeType: params.mimeType,
	});

	await updateCategoryImageUrl(categoryId, storage.publicUrl);

	return { ok: true as const, image_url: storage.publicUrl };
}

export async function uploadCategoryImageFromRemoteUrlForAdmin(params: {
	categoryId: string;
	remoteUrl: string;
}) {
	const businessId = await resolveCatalogTenantBusinessId();
	const categoryId = assertValidCategoryId(params.categoryId);
	await assertCategoryExists(categoryId);

	const storage = await saveCategoryImageFromRemoteUrl({
		projectRoot: getProjectRoot(),
		businessId,
		categoryId,
		remoteUrl: params.remoteUrl,
	});

	await updateCategoryImageUrl(categoryId, storage.publicUrl);

	return { ok: true as const, image_url: storage.publicUrl };
}

export function getCategoryImageStorageForTenant(
	businessId: string,
	categoryId: string,
) {
	return resolveCategoryImageStorage(getProjectRoot(), businessId, categoryId);
}
