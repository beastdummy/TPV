import type {
	ListRecentSalesInput,
	SaleReceiptByIdInput,
	SaleReceiptByReceiptNumberInput,
} from "./sale-read-model.schemas";
import {
	getSaleReceiptByIdForPos,
	getSaleReceiptByReceiptNumberForPos,
	listRecentSalesForPos,
} from "./sale-read-model.server";

export async function handleGetSaleReceiptByIdForPos(
	input: SaleReceiptByIdInput,
) {
	return await getSaleReceiptByIdForPos(input.sale_id);
}

export async function handleGetSaleReceiptByReceiptNumberForPos(
	input: SaleReceiptByReceiptNumberInput,
) {
	return await getSaleReceiptByReceiptNumberForPos(input.receipt_number);
}

export async function handleListRecentSalesForPos(input: ListRecentSalesInput) {
	return await listRecentSalesForPos(input);
}
