import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import {
	CATEGORY_IMAGE_ERROR_CODES,
	CategoryImageError,
} from "./category-image.errors";

export const CATEGORY_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const CATEGORY_IMAGE_DIMENSION = 512;
export const CATEGORY_IMAGE_WEBP_QUALITY = 80;
export const CATEGORY_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const BUSINESS_ID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const REMOTE_FETCH_TIMEOUT_MS = 15_000;

export type CategoryImageStorage = {
	filePath: string;
	publicUrl: string;
};

export function assertValidCategoryId(categoryId: string): string {
	const normalized = categoryId.trim();

	if (!CATEGORY_ID_PATTERN.test(normalized)) {
		throw new CategoryImageError(
			CATEGORY_IMAGE_ERROR_CODES.INVALID_CATEGORY_ID,
			"ID de categoría inválido.",
		);
	}

	return normalized;
}

export function assertValidBusinessId(businessId: string): string {
	const normalized = businessId.trim().toLowerCase();

	if (!BUSINESS_ID_PATTERN.test(normalized)) {
		throw new CategoryImageError(
			CATEGORY_IMAGE_ERROR_CODES.INVALID_BUSINESS_ID,
			"ID de negocio inválido.",
		);
	}

	return normalized;
}

export function resolveCategoryImageStorage(
	projectRoot: string,
	businessId: string,
	categoryId: string,
): CategoryImageStorage {
	const safeBusinessId = assertValidBusinessId(businessId);
	const safeCategoryId = assertValidCategoryId(categoryId);
	const uploadsRoot = path.resolve(
		projectRoot,
		"public",
		"uploads",
		"businesses",
	);
	const filePath = path.resolve(
		uploadsRoot,
		safeBusinessId,
		"categories",
		`${safeCategoryId}.webp`,
	);

	if (!filePath.startsWith(`${uploadsRoot}${path.sep}`)) {
		throw new CategoryImageError(
			CATEGORY_IMAGE_ERROR_CODES.PATH_TRAVERSAL,
			"Ruta de imagen no permitida.",
		);
	}

	return {
		filePath,
		publicUrl: `/uploads/businesses/${safeBusinessId}/categories/${safeCategoryId}.webp`,
	};
}

export function assertImageMimeType(mimeType: string | null | undefined): void {
	if (!mimeType?.startsWith("image/")) {
		throw new CategoryImageError(
			CATEGORY_IMAGE_ERROR_CODES.INVALID_MIME,
			"Solo se permiten archivos de imagen.",
		);
	}
}

export function assertImageBufferSize(byteLength: number): void {
	if (byteLength <= 0 || byteLength > CATEGORY_IMAGE_MAX_BYTES) {
		throw new CategoryImageError(
			CATEGORY_IMAGE_ERROR_CODES.FILE_TOO_LARGE,
			`La imagen supera el límite de ${CATEGORY_IMAGE_MAX_BYTES} bytes.`,
		);
	}
}

export function assertValidRemoteImageUrl(remoteUrl: string): URL {
	let parsed: URL;

	try {
		parsed = new URL(remoteUrl.trim());
	} catch {
		throw new CategoryImageError(
			CATEGORY_IMAGE_ERROR_CODES.INVALID_REMOTE_URL,
			"URL remota inválida.",
		);
	}

	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		throw new CategoryImageError(
			CATEGORY_IMAGE_ERROR_CODES.INVALID_REMOTE_URL,
			"La URL remota debe ser http o https.",
		);
	}

	if (!parsed.hostname) {
		throw new CategoryImageError(
			CATEGORY_IMAGE_ERROR_CODES.INVALID_REMOTE_URL,
			"URL remota inválida.",
		);
	}

	return parsed;
}

export async function processCategoryImageBuffer(
	input: Buffer,
): Promise<Buffer> {
	try {
		return await sharp(input)
			.resize(CATEGORY_IMAGE_DIMENSION, CATEGORY_IMAGE_DIMENSION, {
				fit: "cover",
				position: "centre",
			})
			.webp({ quality: CATEGORY_IMAGE_WEBP_QUALITY })
			.toBuffer();
	} catch {
		throw new CategoryImageError(
			CATEGORY_IMAGE_ERROR_CODES.INVALID_IMAGE,
			"No se pudo procesar la imagen.",
		);
	}
}

export async function fetchRemoteImageBuffer(remoteUrl: string): Promise<{
	buffer: Buffer;
	mimeType: string | null;
}> {
	const parsed = assertValidRemoteImageUrl(remoteUrl);
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), REMOTE_FETCH_TIMEOUT_MS);

	try {
		const response = await fetch(parsed.toString(), {
			signal: controller.signal,
			redirect: "follow",
		});

		if (!response.ok) {
			throw new CategoryImageError(
				CATEGORY_IMAGE_ERROR_CODES.INVALID_REMOTE_URL,
				"No se pudo descargar la imagen remota.",
			);
		}

		const mimeType = response.headers.get("content-type");
		assertImageMimeType(mimeType?.split(";")[0]?.trim() ?? null);

		const arrayBuffer = await response.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		assertImageBufferSize(buffer.byteLength);

		return { buffer, mimeType };
	} catch (error) {
		if (error instanceof CategoryImageError) {
			throw error;
		}

		throw new CategoryImageError(
			CATEGORY_IMAGE_ERROR_CODES.INVALID_REMOTE_URL,
			"No se pudo descargar la imagen remota.",
		);
	} finally {
		clearTimeout(timeout);
	}
}

export async function saveCategoryImageFile(params: {
	projectRoot: string;
	businessId: string;
	categoryId: string;
	buffer: Buffer;
}): Promise<CategoryImageStorage> {
	const storage = resolveCategoryImageStorage(
		params.projectRoot,
		params.businessId,
		params.categoryId,
	);
	const processed = await processCategoryImageBuffer(params.buffer);

	await mkdir(path.dirname(storage.filePath), { recursive: true });
	await writeFile(storage.filePath, processed);

	return storage;
}

export async function saveCategoryImageFromUpload(params: {
	projectRoot: string;
	businessId: string;
	categoryId: string;
	buffer: Buffer;
	mimeType: string | null;
}): Promise<CategoryImageStorage> {
	assertImageMimeType(params.mimeType);
	assertImageBufferSize(params.buffer.byteLength);

	return await saveCategoryImageFile({
		projectRoot: params.projectRoot,
		businessId: params.businessId,
		categoryId: params.categoryId,
		buffer: params.buffer,
	});
}

export async function saveCategoryImageFromRemoteUrl(params: {
	projectRoot: string;
	businessId: string;
	categoryId: string;
	remoteUrl: string;
}): Promise<CategoryImageStorage> {
	const { buffer } = await fetchRemoteImageBuffer(params.remoteUrl);

	return await saveCategoryImageFile({
		projectRoot: params.projectRoot,
		businessId: params.businessId,
		categoryId: params.categoryId,
		buffer,
	});
}
