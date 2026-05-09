import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { ensureCatalogManagementRole, getAppUserFn } from "../auth/auth.rpc";
import {
	createPurchaseReceipt,
	createSupplier,
	getRecentPurchaseReceipts,
	getSuppliers,
} from "./queries.server";

const supplierSchema = z.object({
	name: z.string().trim().min(1).max(140),
	tax_id: z.string().trim().max(80),
	email: z.string().trim().max(140),
	phone: z.string().trim().max(80),
});

const purchaseReceiptSchema = z.object({
	supplier_id: z.string().trim().min(1),
	warehouse_id: z.string().trim().min(1).max(80),
	product_id: z.string().trim().min(1),
	quantity: z.number().positive(),
	unit_cost: z.number().min(0),
	notes: z.string().trim().max(500),
});

export const getSuppliersFn = createServerFn({ method: "GET" }).handler(
	async () => {
		await ensureCatalogManagementRole();
		return await getSuppliers();
	},
);

export const createSupplierFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => supplierSchema.parse(data))
	.handler(async ({ data }) => {
		await ensureCatalogManagementRole();
		const supplierId = await createSupplier(data);
		return { ok: true, supplierId };
	});

export const createPurchaseReceiptFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => purchaseReceiptSchema.parse(data))
	.handler(async ({ data }) => {
		await ensureCatalogManagementRole();
		const user = await getAppUserFn();

		if (!user) {
			throw new Error("UNAUTHORIZED");
		}

		return await createPurchaseReceipt({
			...data,
			created_by_user_id: user.id,
		});
	});

export const getRecentPurchaseReceiptsFn = createServerFn({
	method: "GET",
}).handler(async () => {
	await ensureCatalogManagementRole();
	return await getRecentPurchaseReceipts();
});
