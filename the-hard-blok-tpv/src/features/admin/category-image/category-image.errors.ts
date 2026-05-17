export const CATEGORY_IMAGE_ERROR_CODES = {
	INVALID_CATEGORY_ID: "INVALID_CATEGORY_ID",
	INVALID_BUSINESS_ID: "INVALID_BUSINESS_ID",
	INVALID_MIME: "INVALID_MIME",
	FILE_TOO_LARGE: "FILE_TOO_LARGE",
	INVALID_REMOTE_URL: "INVALID_REMOTE_URL",
	CATEGORY_NOT_FOUND: "CATEGORY_NOT_FOUND",
	INVALID_IMAGE: "INVALID_IMAGE",
	TENANT_NOT_FOUND: "TENANT_NOT_FOUND",
	PATH_TRAVERSAL: "PATH_TRAVERSAL",
	MISSING_FILE: "MISSING_FILE",
} as const;

export type CategoryImageErrorCode =
	(typeof CATEGORY_IMAGE_ERROR_CODES)[keyof typeof CATEGORY_IMAGE_ERROR_CODES];

export class CategoryImageError extends Error {
	readonly code: CategoryImageErrorCode;

	constructor(code: CategoryImageErrorCode, message: string) {
		super(message);
		this.name = "CategoryImageError";
		this.code = code;
	}
}
