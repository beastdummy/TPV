import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	insertSalePayment: vi.fn(),
}));

vi.mock("../sale-payment-queries.server", () => ({
	insertSalePayment: mocks.insertSalePayment,
}));

import { SALES_TX_ERROR_CODES } from "./errors";
import {
	insertInternalSalePaymentSnapshot,
	resolveInternalPaymentStatus,
} from "./finalize-sale-payment.server";

const mockClient = {} as import("pg").PoolClient;

describe("finalize-sale-payment.server", () => {
	it("resolves completed status for cash", () => {
		expect(resolveInternalPaymentStatus("cash")).toBe("completed");
	});

	it("resolves pending status for card snapshot", () => {
		expect(resolveInternalPaymentStatus("card")).toBe("pending");
	});

	it("rejects mixed payments", () => {
		expect(() => resolveInternalPaymentStatus("mixed")).toThrow(
			expect.objectContaining({
				code: SALES_TX_ERROR_CODES.VALIDATION,
			}),
		);
	});

	it("persists internal cash payment snapshot", async () => {
		mocks.insertSalePayment.mockResolvedValue({
			id: "pay-1",
			sale_id: "sale-1",
			business_id: "biz-1",
			payment_method: "cash",
			amount: 20,
			currency: "EUR",
			status: "completed",
			provider: "internal",
			provider_reference: null,
			created_at: "2026-01-01T10:00:00Z",
			processed_at: "2026-01-01T10:00:00Z",
		});

		const payment = await insertInternalSalePaymentSnapshot(mockClient, {
			sale_id: "sale-1",
			business_id: "biz-1",
			payment_method: "cash",
			amount: 20,
		});

		expect(payment.status).toBe("completed");
		expect(mocks.insertSalePayment).toHaveBeenCalledWith(
			expect.objectContaining({
				provider: "internal",
				status: "completed",
				amount: 20,
				provider_reference: null,
			}),
			mockClient,
		);
		expect(
			mocks.insertSalePayment.mock.calls[0]?.[0].processed_at,
		).toBeTruthy();
	});
});
