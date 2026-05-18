import { describe, expect, it } from "vitest";

import {
	buildFinalizeSaleLinesFromTicket,
	POS_DEFAULT_TAX_RATE_PERCENT,
} from "./build-pos-sale-payload";

describe("build-pos-sale-payload", () => {
	it("maps ticket lines to finalize sale input", () => {
		expect(
			buildFinalizeSaleLinesFromTicket([
				{
					id: "00000000-0000-4000-8000-000000000099",
					name: "Café",
					price: 2.5,
					quantity: 2,
					discountPercent: 10,
				},
			]),
		).toEqual([
			{
				product_id: "00000000-0000-4000-8000-000000000099",
				product_name: "Café",
				quantity: 2,
				unit_price: 2.5,
				discount_percent: 10,
				tax_rate: POS_DEFAULT_TAX_RATE_PERCENT,
			},
		]);
	});
});
