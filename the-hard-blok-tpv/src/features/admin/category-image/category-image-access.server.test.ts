import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	requireBusinessRole: vi.fn(),
	getCategoryById: vi.fn(),
	updateCategoryImageUrl: vi.fn(),
	saveCategoryImageFromUpload: vi.fn(),
	saveCategoryImageFromRemoteUrl: vi.fn(),
}));

vi.mock("../products-access.server", () => ({
	ensureCatalogManagementBusinessRole: mocks.requireBusinessRole,
}));

vi.mock("../queries.server", () => ({
	getCategoryById: mocks.getCategoryById,
	updateCategoryImageUrl: mocks.updateCategoryImageUrl,
}));

vi.mock("./category-image.server", () => ({
	assertValidCategoryId: (id: string) => id,
	saveCategoryImageFromUpload: mocks.saveCategoryImageFromUpload,
	saveCategoryImageFromRemoteUrl: mocks.saveCategoryImageFromRemoteUrl,
}));

import {
	CATEGORY_IMAGE_ERROR_CODES,
	CategoryImageError,
} from "./category-image.errors";
import {
	uploadCategoryImageFileForAdmin,
	uploadCategoryImageFromRemoteUrlForAdmin,
} from "./category-image-access.server";

const businessA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const businessB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("category-image-access.server", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("saves image_url in database after file upload", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			business: { businessId: businessA },
		});
		mocks.getCategoryById.mockResolvedValue({ id: "bebidas" });
		mocks.saveCategoryImageFromUpload.mockResolvedValue({
			publicUrl: `/uploads/businesses/${businessA}/categories/bebidas.webp`,
		});

		const result = await uploadCategoryImageFileForAdmin({
			categoryId: "bebidas",
			buffer: Buffer.from("img"),
			mimeType: "image/png",
		});

		expect(result.image_url).toBe(
			`/uploads/businesses/${businessA}/categories/bebidas.webp`,
		);
		expect(mocks.updateCategoryImageUrl).toHaveBeenCalledWith(
			"bebidas",
			result.image_url,
		);
	});

	it("uses tenant business id for isolated storage paths", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			business: { businessId: businessB },
		});
		mocks.getCategoryById.mockResolvedValue({ id: "snacks" });
		mocks.saveCategoryImageFromRemoteUrl.mockResolvedValue({
			publicUrl: `/uploads/businesses/${businessB}/categories/snacks.webp`,
		});

		await uploadCategoryImageFromRemoteUrlForAdmin({
			categoryId: "snacks",
			remoteUrl: "https://example.com/snacks.png",
		});

		expect(mocks.saveCategoryImageFromRemoteUrl).toHaveBeenCalledWith(
			expect.objectContaining({
				businessId: businessB,
				categoryId: "snacks",
			}),
		);
	});

	it("fails when remote URL validation fails upstream", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			business: { businessId: businessA },
		});
		mocks.getCategoryById.mockResolvedValue({ id: "bebidas" });
		mocks.saveCategoryImageFromRemoteUrl.mockRejectedValue(
			new CategoryImageError(
				CATEGORY_IMAGE_ERROR_CODES.INVALID_REMOTE_URL,
				"URL remota inválida.",
			),
		);

		await expect(
			uploadCategoryImageFromRemoteUrlForAdmin({
				categoryId: "bebidas",
				remoteUrl: "not-valid",
			}),
		).rejects.toMatchObject({
			code: CATEGORY_IMAGE_ERROR_CODES.INVALID_REMOTE_URL,
		});
	});

	it("fails on invalid MIME during file upload", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			business: { businessId: businessA },
		});
		mocks.getCategoryById.mockResolvedValue({ id: "bebidas" });
		mocks.saveCategoryImageFromUpload.mockRejectedValue(
			new CategoryImageError(
				CATEGORY_IMAGE_ERROR_CODES.INVALID_MIME,
				"Solo se permiten archivos de imagen.",
			),
		);

		await expect(
			uploadCategoryImageFileForAdmin({
				categoryId: "bebidas",
				buffer: Buffer.from("x"),
				mimeType: "text/plain",
			}),
		).rejects.toMatchObject({
			code: CATEGORY_IMAGE_ERROR_CODES.INVALID_MIME,
		});
	});

	it("requires tenant business context", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			business: null,
			roleSource: "legacy",
		});

		await expect(
			uploadCategoryImageFileForAdmin({
				categoryId: "bebidas",
				buffer: Buffer.from("img"),
				mimeType: "image/png",
			}),
		).rejects.toMatchObject({
			code: CATEGORY_IMAGE_ERROR_CODES.TENANT_NOT_FOUND,
		});
	});
});
