import { createServerFn } from "@tanstack/react-start";

import { loadOperationalWarehouseForPos } from "./operational-warehouse-access.server";

export const getOperationalWarehouseForPosFn = createServerFn({
	method: "GET",
}).handler(async () => {
	return await loadOperationalWarehouseForPos();
});
