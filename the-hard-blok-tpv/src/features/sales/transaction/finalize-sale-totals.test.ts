import { describe, expect, it } from "vitest";

import { computeSaleLine, computeSaleTotals } from "./finalize-sale-totals";

describe("finalize-sale-totals", () => {
	it("computes line totals with discount and tax", () => {
		const line = computeSaleLine({
			product_id: "p1",
			product_name: "Café",
			quantity: 2,
			unit_price: 10,
			discount_percent: 10,
			tax_rate: 21,
		});

		expect(line.line_discount).toBe(2);
		expect(line.line_tax).toBe(3.78);
		expect(line.line_total).toBe(21.78);
	});

	it("aggregates sale totals", () => {
		const lines = [
			computeSaleLine({
				product_id: "p1",
				product_name: "A",
				quantity: 1,
				unit_price: 100,
				discount_percent: 0,
				tax_rate: 10,
			}),
		];

		expect(computeSaleTotals(lines)).toEqual({
			subtotal: 100,
			discount_total: 0,
			tax_total: 10,
			total: 110,
		});
	});
});
