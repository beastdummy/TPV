import { createServerFn } from "@tanstack/react-start";

import { loadSalesCatalogForPos } from "./sales-access.server";

/** Catálogo de venta (categorías + productos) — tenant-aware (/sales loader). */
export const getSalesCatalogForPosFn = createServerFn({
	method: "GET",
}).handler(async () => {
	return await loadSalesCatalogForPos();
});
