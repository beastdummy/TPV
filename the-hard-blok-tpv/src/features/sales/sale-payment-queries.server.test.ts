import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	query: vi.fn(),
}));

vi.mock("../../lib/db.server", () => ({
	db: { query: mocks.query },
}));

import {
	insertSalePayment,
	listSalePaymentsBySale,
} from "./sale-payment-queries.server";

const businessId = "biz-1";
const saleId = "sale-1";

const paymentRow = {
	id: "pay-1",
	sale_id: saleId,
	business_id: businessId,
	payment_method: "cash" as const,
	amount: "12.5",
	currency: "EUR",
	status: "completed" as const,
	provider: "internal" as const,
	provider_reference: null,
	created_at: "2026-01-01T10:00:00Z",
	processed_at: "2026-01-01T10:00:00Z",
};

describe("sale-payment-queries.server", () => {
	afterEach(() => {
		vi.resetAllMocks();
	});

	it("inserts a payment linked to a sale", async () => {
		mocks.query.mockResolvedValue({ rows: [paymentRow] });

		const payment = await insertSalePayment({
			sale_id: saleId,
			business_id: businessId,
			payment_method: "cash",
			amount: 12.5,
			currency: "EUR",
			status: "completed",
			provider: "internal",
			processed_at: "2026-01-01T10:00:00Z",
		});

		expect(payment).toMatchObject({
			id: "pay-1",
			sale_id: saleId,
			business_id: businessId,
			amount: 12.5,
			status: "completed",
		});
		expect(mocks.query).toHaveBeenCalledWith(
			expect.stringContaining("INSERT INTO sale_payments"),
			expect.arrayContaining([saleId, businessId, "cash", 12.5]),
		);
	});

	it("lists multiple payments for the same sale", async () => {
		mocks.query.mockResolvedValue({
			rows: [
				paymentRow,
				{
					...paymentRow,
					id: "pay-2",
					payment_method: "card",
					status: "pending",
					amount: "5",
					processed_at: null,
				},
			],
		});

		const payments = await listSalePaymentsBySale(businessId, saleId);

		expect(payments).toHaveLength(2);
		expect(payments[0]?.sale_id).toBe(saleId);
		expect(payments[1]?.payment_method).toBe("card");
		expect(mocks.query).toHaveBeenCalledWith(
			expect.stringContaining("FROM sale_payments"),
			[businessId, saleId],
		);
	});
});
