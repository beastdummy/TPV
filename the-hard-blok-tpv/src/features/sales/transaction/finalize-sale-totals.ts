import type { SaleLineInput } from "./types";

export type ComputedSaleLine = SaleLineInput & {
	tax_rate: number;
	line_total: number;
	line_discount: number;
	line_tax: number;
};

export type SaleTotals = {
	subtotal: number;
	discount_total: number;
	tax_total: number;
	total: number;
};

export function roundMoney(value: number): number {
	return Math.round(value * 100) / 100;
}

export function computeSaleLine(line: SaleLineInput): ComputedSaleLine {
	const taxRate = line.tax_rate ?? 0;
	const gross = line.quantity * line.unit_price;
	const lineDiscount = roundMoney(gross * (line.discount_percent / 100));
	const net = gross - lineDiscount;
	const lineTax = roundMoney(net * (taxRate / 100));
	const lineTotal = roundMoney(net + lineTax);

	return {
		...line,
		tax_rate: taxRate,
		line_discount: lineDiscount,
		line_tax: lineTax,
		line_total: lineTotal,
	};
}

export function computeSaleTotals(lines: ComputedSaleLine[]): SaleTotals {
	const subtotal = roundMoney(
		lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0),
	);
	const discount_total = roundMoney(
		lines.reduce((sum, line) => sum + line.line_discount, 0),
	);
	const tax_total = roundMoney(
		lines.reduce((sum, line) => sum + line.line_tax, 0),
	);
	const total = roundMoney(
		lines.reduce((sum, line) => sum + line.line_total, 0),
	);

	return { subtotal, discount_total, tax_total, total };
}
