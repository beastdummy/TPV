import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	finalizeSaleAccess: vi.fn(),
}));

vi.mock("../finalize-sale-access.server", () => ({
	finalizeSale: mocks.finalizeSaleAccess,
}));

import {
	buildSaleIdempotencyKey,
	finalizeSale,
	parseSaleIdempotencyKey,
	SALES_FINALIZE_BOUNDARY,
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

	it("finalizeSale delegates to access layer", async () => {
		mocks.finalizeSaleAccess.mockResolvedValue({
			sale_id: "sale-1",
			receipt_number: 1,
			status: "completed",
			total: 10,
			idempotency_key: "k",
		});

		await expect(
			finalizeSale({
				client_request_id: "req-1",
				cash_session_id: "sess-1",
				warehouse_id: "principal",
				payment_method: "cash",
				lines: [
					{
						product_id: "00000000-0000-4000-8000-000000000099",
						product_name: "X",
						quantity: 1,
						unit_price: 10,
						discount_percent: 0,
					},
				],
			}),
		).resolves.toMatchObject({ sale_id: "sale-1" });

		expect(mocks.finalizeSaleAccess).toHaveBeenCalled();
	});
});
