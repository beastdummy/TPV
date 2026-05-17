import { describe, expect, it } from "vitest";

import {
	buildSaleIdempotencyKey,
	finalizeSaleStub,
	parseSaleIdempotencyKey,
	SALES_FINALIZE_BOUNDARY,
	SALES_TX_ERROR_CODES,
} from "./index";

describe("sales/transaction scaffolding", () => {
	it("defines finalize boundary order", () => {
		expect(SALES_FINALIZE_BOUNDARY[0]).toBe("validate_context");
		expect(SALES_FINALIZE_BOUNDARY).toContain("decrement_stock");
		expect(SALES_FINALIZE_BOUNDARY.at(-1)).toBe("store_idempotency_result");
	});

	it("builds and parses idempotency keys", () => {
		const key = buildSaleIdempotencyKey({
			businessId: "biz-1",
			operation: "finalize_sale",
			clientRequestId: "req-abc",
		});

		expect(key).toBe("sale:v1:biz-1:finalize_sale:req-abc");
		expect(parseSaleIdempotencyKey(key)).toEqual({
			raw: key,
			businessId: "biz-1",
			operation: "finalize_sale",
			clientRequestId: "req-abc",
		});
	});

	it("finalizeSaleStub remains not implemented", async () => {
		await expect(
			finalizeSaleStub({
				client_request_id: "req-1",
				cash_session_id: "sess-1",
				warehouse_id: "principal",
				payment_method: "cash",
				lines: [],
			}),
		).rejects.toMatchObject({
			code: SALES_TX_ERROR_CODES.NOT_IMPLEMENTED,
		});
	});
});
