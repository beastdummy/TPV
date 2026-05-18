import { createServerFn } from "@tanstack/react-start";

import { ensurePosOperationRole } from "../auth/auth.rpc";
import { getSalesCatalog } from "./queries.server";
import type { SalesCatalog } from "./types";

export type {
	SalesCatalog,
	SalesCategory,
	SalesProduct,
} from "./types";

type OpenDrawerResult = {
	ok: true;
	openedAt: string;
	message: string;
};

export const getSalesCatalogFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<SalesCatalog> => {
		await ensurePosOperationRole();
		return await getSalesCatalog();
	},
);

export const openCashDrawerFn = createServerFn({ method: "POST" }).handler(
	async (): Promise<OpenDrawerResult> => {
		await ensurePosOperationRole();

		// Punto backend para integrar hardware real de cajón.
		// Por ahora devolvemos confirmación para que la acción del TPV quede operativa.
		return {
			ok: true,
			openedAt: new Date().toISOString(),
			message: "Cajón abierto (simulado).",
		};
	},
);
