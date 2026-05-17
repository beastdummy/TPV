import { afterEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

const mocks = vi.hoisted(() => ({
	getSaleReceiptByIdForPos: vi.fn(),
	getSaleReceiptByReceiptNumberForPos: vi.fn(),
	listRecentSalesForPos: vi.fn(),
}));

vi.mock("./sale-read-model.server", () => ({
	getSaleReceiptByIdForPos: mocks.getSaleReceiptByIdForPos,
	getSaleReceiptByReceiptNumberForPos:
		mocks.getSaleReceiptByReceiptNumberForPos,
	listRecentSalesForPos: mocks.listRecentSalesForPos,
}));

import {
	handleGetSaleReceiptByIdForPos,
	handleGetSaleReceiptByReceiptNumberForPos,
	handleListRecentSalesForPos,
	listRecentSalesSchema,
	saleReceiptByIdSchema,
	saleReceiptByReceiptNumberSchema,
} from "./sale-read-model.server-fns";

const saleId = "00000000-0000-4000-8000-000000000001";
const receipt = {
	sale: { id: saleId, receipt_number: 42, total: 10 },
	items: [],
	payments: [],
	cash_session: { id: "sess-1" },
	stock_movements: [],
};

describe("sale-read-model.server-fns", () => {
	afterEach(() => {
		vi.resetAllMocks();
	});

	it("RPC handler getSaleReceiptByIdForPos delegates to read model", async () => {
		mocks.getSaleReceiptByIdForPos.mockResolvedValue(receipt);

		const result = await handleGetSaleReceiptByIdForPos({ sale_id: saleId });

		expect(result).toEqual(receipt);
		expect(mocks.getSaleReceiptByIdForPos).toHaveBeenCalledWith(saleId);
	});

	it("RPC handler getSaleReceiptByReceiptNumberForPos delegates to read model", async () => {
		mocks.getSaleReceiptByReceiptNumberForPos.mockResolvedValue(receipt);

		const result = await handleGetSaleReceiptByReceiptNumberForPos({
			receipt_number: 42,
		});

		expect(result).toEqual(receipt);
		expect(mocks.getSaleReceiptByReceiptNumberForPos).toHaveBeenCalledWith(42);
	});

	it("RPC handler listRecentSalesForPos delegates to read model", async () => {
		const summaries = [{ id: saleId, receipt_number: 42, total: 10 }];
		mocks.listRecentSalesForPos.mockResolvedValue(summaries);

		const result = await handleListRecentSalesForPos({
			limit: 20,
			terminal_id: "tpv-1",
		});

		expect(result).toEqual(summaries);
		expect(mocks.listRecentSalesForPos).toHaveBeenCalledWith({
			limit: 20,
			terminal_id: "tpv-1",
		});
	});

	it("rejects invalid sale_id UUID", () => {
		expect(() =>
			saleReceiptByIdSchema.parse({ sale_id: "not-a-uuid" }),
		).toThrow(ZodError);
	});

	it("rejects invalid receipt_number", () => {
		expect(() =>
			saleReceiptByReceiptNumberSchema.parse({ receipt_number: 0 }),
		).toThrow(ZodError);
		expect(() =>
			saleReceiptByReceiptNumberSchema.parse({ receipt_number: 1.5 }),
		).toThrow(ZodError);
	});

	it("rejects invalid listRecentSales input", () => {
		expect(() => listRecentSalesSchema.parse({ limit: 0 })).toThrow(ZodError);
		expect(() => listRecentSalesSchema.parse({ limit: 101 })).toThrow(ZodError);
		expect(() => listRecentSalesSchema.parse({ terminal_id: "" })).toThrow(
			ZodError,
		);
	});
});
