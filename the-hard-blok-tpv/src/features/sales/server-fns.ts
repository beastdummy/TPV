import { createServerFn } from "@tanstack/react-start";

type OpenDrawerResult = {
	ok: true;
	openedAt: string;
	message: string;
};

export const openCashDrawerFn = createServerFn({ method: "POST" }).handler(
	async (): Promise<OpenDrawerResult> => {
		// Punto backend para integrar hardware real de cajón.
		// Por ahora devolvemos confirmación para que la acción del TPV quede operativa.
		return {
			ok: true,
			openedAt: new Date().toISOString(),
			message: "Cajón abierto (simulado).",
		};
	},
);
