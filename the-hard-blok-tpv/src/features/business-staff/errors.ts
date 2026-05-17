export const BUSINESS_STAFF_ERRORS = {
	UNAUTHORIZED: "UNAUTHORIZED",
	FORBIDDEN: "FORBIDDEN",
	TENANT_NOT_FOUND: "TENANT_NOT_FOUND",
	NOT_FOUND: "NOT_FOUND",
	VALIDATION: "VALIDATION",
	DUPLICATE_EMAIL: "DUPLICATE_EMAIL",
	DUPLICATE_ROLE_NAME: "DUPLICATE_ROLE_NAME",
	ROLE_IN_USE: "ROLE_IN_USE",
	OWNER_PROTECTED: "OWNER_PROTECTED",
} as const;

export class BusinessStaffError extends Error {
	readonly code: (typeof BUSINESS_STAFF_ERRORS)[keyof typeof BUSINESS_STAFF_ERRORS];

	constructor(
		code: (typeof BUSINESS_STAFF_ERRORS)[keyof typeof BUSINESS_STAFF_ERRORS],
		message: string,
	) {
		super(message);
		this.name = "BusinessStaffError";
		this.code = code;
	}
}
