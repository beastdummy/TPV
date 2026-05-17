export const REGISTER_ERROR_CODES = [
	"EMAIL_ALREADY_EXISTS",
	"BUSINESS_SLUG_ALREADY_EXISTS",
	"INVALID_REGISTER_INPUT",
] as const;

export type RegisterErrorCode = (typeof REGISTER_ERROR_CODES)[number];

export class RegisterCustomerError extends Error {
	readonly code: RegisterErrorCode;

	constructor(code: RegisterErrorCode, message: string) {
		super(message);
		this.name = "RegisterCustomerError";
		this.code = code;
	}
}

export function isRegisterCustomerError(
	error: unknown,
): error is RegisterCustomerError {
	return error instanceof RegisterCustomerError;
}
