import { z } from "zod";

import { SLUG_PATTERN } from "../tenancy/slug";
import { RegisterCustomerError } from "./register.errors";

export const registerCustomerOwnerSchema = z.object({
	userName: z
		.string()
		.trim()
		.min(2, "El nombre debe tener al menos 2 caracteres.")
		.max(120, "El nombre es demasiado largo."),
	email: z.email("Introduce un email válido."),
	password: z
		.string()
		.min(8, "La contraseña debe tener al menos 8 caracteres.")
		.max(128, "La contraseña es demasiado larga."),
	businessName: z
		.string()
		.trim()
		.min(2, "El nombre del negocio debe tener al menos 2 caracteres.")
		.max(120, "El nombre del negocio es demasiado largo."),
	businessSlug: z
		.string()
		.trim()
		.max(64, "El slug es demasiado largo.")
		.optional()
		.transform((value) => (value === "" ? undefined : value)),
	posPin: z
		.string()
		.trim()
		.regex(/^\d{4,8}$/, "El PIN TPV debe tener entre 4 y 8 dígitos."),
});

export type RegisterCustomerOwnerInput = z.infer<
	typeof registerCustomerOwnerSchema
>;

export function parseRegisterCustomerOwnerInput(
	data: unknown,
): RegisterCustomerOwnerInput {
	const parsed = registerCustomerOwnerSchema.safeParse(data);

	if (!parsed.success) {
		const message =
			parsed.error.issues[0]?.message ?? "Datos de registro inválidos.";
		throw new RegisterCustomerError("INVALID_REGISTER_INPUT", message);
	}

	const slug = parsed.data.businessSlug;
	if (slug !== undefined && !SLUG_PATTERN.test(slug)) {
		throw new RegisterCustomerError(
			"INVALID_REGISTER_INPUT",
			"El slug solo puede contener letras minúsculas, números y guiones.",
		);
	}

	return parsed.data;
}
