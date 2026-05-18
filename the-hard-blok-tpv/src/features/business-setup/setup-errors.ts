import { ZodError } from "zod";

export function formatSetupRpcError(error: unknown): string {
	if (error instanceof ZodError) {
		return error.issues[0]?.message ?? "Datos inválidos.";
	}

	if (error instanceof Error) {
		const message = error.message.trim();
		if (message === "TENANT_NOT_FOUND") {
			return "No se encontró el negocio activo. Vuelve a iniciar sesión.";
		}
		if (message === "FORBIDDEN") {
			return "Solo el propietario puede completar la configuración inicial.";
		}
		if (message.includes("setup_business_confirmed_at")) {
			return "Falta aplicar migraciones de base de datos. Ejecuta: npm run db:migrate:tenancy";
		}
		return message || "No se pudo completar el paso.";
	}

	if (typeof error === "object" && error !== null && "message" in error) {
		const message = String((error as { message: unknown }).message);
		if (message) {
			return message;
		}
	}

	return "No se pudo completar el paso.";
}
