import { afterEach, describe, expect, it, vi } from "vitest";

const sharpMocks = vi.hoisted(() => ({
	toBuffer: vi.fn(),
	webp: vi.fn(),
	resize: vi.fn(),
}));

const fsMocks = vi.hoisted(() => ({
	mkdir: vi.fn(),
	writeFile: vi.fn(),
}));

vi.mock("sharp", () => {
	const pipeline = {
		resize: sharpMocks.resize.mockReturnThis(),
		webp: sharpMocks.webp.mockReturnThis(),
		toBuffer: sharpMocks.toBuffer,
	};
	return {
		default: vi.fn(() => pipeline),
	};
});

vi.mock("node:fs/promises", () => ({
	mkdir: fsMocks.mkdir,
	writeFile: fsMocks.writeFile,
}));

import {
	CATEGORY_IMAGE_ERROR_CODES,
	CategoryImageError,
} from "./category-image.errors";
import {
	assertImageMimeType,
	assertValidRemoteImageUrl,
	fetchRemoteImageBuffer,
	processCategoryImageBuffer,
	resolveCategoryImageStorage,
	saveCategoryImageFromUpload,
} from "./category-image.server";

describe("category-image.server", () => {
	afterEach(() => {
		vi.clearAllMocks();
		vi.unstubAllGlobals();
		fsMocks.mkdir.mockReset();
		fsMocks.writeFile.mockReset();
	});

	it("resolves tenant-isolated storage paths", () => {
		const businessA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
		const businessB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

		const pathA = resolveCategoryImageStorage("/app", businessA, "bebidas");
		const pathB = resolveCategoryImageStorage("/app", businessB, "bebidas");

		expect(pathA.publicUrl).toBe(
			`/uploads/businesses/${businessA}/categories/bebidas.webp`,
		);
		expect(pathB.publicUrl).toBe(
			`/uploads/businesses/${businessB}/categories/bebidas.webp`,
		);
		expect(pathA.filePath).not.toBe(pathB.filePath);
	});

	it("rejects invalid remote URL", () => {
		expect(() => assertValidRemoteImageUrl("not-a-url")).toThrow(
			CategoryImageError,
		);
		expect(() => assertValidRemoteImageUrl("ftp://example.com/a.png")).toThrow(
			expect.objectContaining({
				code: CATEGORY_IMAGE_ERROR_CODES.INVALID_REMOTE_URL,
			}),
		);
	});

	it("rejects invalid MIME type", () => {
		expect(() => assertImageMimeType("application/pdf")).toThrow(
			expect.objectContaining({
				code: CATEGORY_IMAGE_ERROR_CODES.INVALID_MIME,
			}),
		);
	});

	it("processes buffers with sharp webp settings", async () => {
		sharpMocks.toBuffer.mockResolvedValue(Buffer.from("webp"));

		const result = await processCategoryImageBuffer(Buffer.from("input"));

		expect(result.toString()).toBe("webp");
		expect(sharpMocks.resize).toHaveBeenCalledWith(512, 512, {
			fit: "cover",
			position: "centre",
		});
		expect(sharpMocks.webp).toHaveBeenCalledWith({ quality: 80 });
	});

	it("rejects remote responses with non-image content-type", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				headers: {
					get: () => "application/json",
				},
				arrayBuffer: async () => new ArrayBuffer(8),
			}),
		);

		await expect(
			fetchRemoteImageBuffer("https://example.com/image.png"),
		).rejects.toMatchObject({
			code: CATEGORY_IMAGE_ERROR_CODES.INVALID_MIME,
		});
	});
});

describe("saveCategoryImageFromUpload", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("writes webp file and returns public URL", async () => {
		sharpMocks.toBuffer.mockResolvedValue(Buffer.from("webp-bytes"));
		fsMocks.mkdir.mockResolvedValue(undefined);
		fsMocks.writeFile.mockResolvedValue(undefined);

		const businessId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
		const result = await saveCategoryImageFromUpload({
			projectRoot: "/tmp/project",
			businessId,
			categoryId: "bebidas",
			buffer: Buffer.from("jpeg"),
			mimeType: "image/jpeg",
		});

		expect(result.publicUrl).toBe(
			`/uploads/businesses/${businessId}/categories/bebidas.webp`,
		);
		expect(fsMocks.mkdir).toHaveBeenCalled();
		expect(fsMocks.writeFile).toHaveBeenCalled();
	});
});
