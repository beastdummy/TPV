import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	requireBusinessRole: vi.fn(),
	resolveDefaultBusinessContext: vi.fn(),
	query: vi.fn(),
}));

vi.mock("../auth/tenant-guards.server", () => ({
	requireBusinessRole: mocks.requireBusinessRole,
	createTenantAuthError: (code: string) => new Error(code),
	TENANT_AUTH_ERRORS: {
		UNAUTHORIZED: "UNAUTHORIZED",
		FORBIDDEN: "FORBIDDEN",
		TENANT_NOT_FOUND: "TENANT_NOT_FOUND",
	},
}));

vi.mock("../tenancy/context.server", () => ({
	resolveDefaultBusinessContext: mocks.resolveDefaultBusinessContext,
}));

vi.mock("../../lib/db.server", () => ({
	db: { query: mocks.query },
}));

import {
	getSaleReceiptByIdForPos,
	getSaleReceiptByReceiptNumberForPos,
	listRecentSalesForPos,
} from "./sale-read-model.server";
import { SALES_TX_ERROR_CODES } from "./transaction/errors";

const businessId = "biz-1";
const userId = "user-1";
const saleId = "sale-1";
const sessionId = "sess-1";

const saleRow = {
	id: saleId,
	business_id: businessId,
	cash_session_id: sessionId,
	terminal_id: "tpv-1",
	receipt_number: 42,
	status: "completed" as const,
	subtotal: 10,
	tax_total: 0,
	discount_total: 0,
	total: 10,
	payment_method: "cash" as const,
	notes: "",
	created_by_user_id: userId,
	idempotency_key: "key-1",
	created_at: "2026-01-01T12:00:00Z",
	updated_at: "2026-01-01T12:00:00Z",
};

const saleItemRow = {
	id: "line-1",
	sale_id: saleId,
	product_id: "00000000-0000-4000-8000-000000000001",
	product_name: "Café",
	quantity: 1,
	unit_price: 10,
	discount_percent: 0,
	tax_rate: 0,
	line_total: 10,
	sort_order: 0,
	created_at: "2026-01-01T12:00:00Z",
};

const paymentRow = {
	id: "pay-1",
	sale_id: saleId,
	business_id: businessId,
	payment_method: "cash" as const,
	amount: 10,
	currency: "EUR",
	status: "completed" as const,
	provider: "internal" as const,
	provider_reference: null,
	created_at: "2026-01-01T12:00:00Z",
	processed_at: "2026-01-01T12:00:00Z",
};

const cashSessionRow = {
	id: sessionId,
	business_id: businessId,
	terminal_id: "tpv-1",
	status: "open" as const,
	opening_float: 100,
	closing_amount: null,
	opened_by_user_id: userId,
	closed_by_user_id: null,
	opened_at: "2026-01-01T10:00:00Z",
	closed_at: null,
	notes: "",
	created_at: "2026-01-01T10:00:00Z",
	updated_at: "2026-01-01T10:00:00Z",
};

const stockMovementRow = {
	id: "mov-1",
	product_id: saleItemRow.product_id,
	product_name: "Café",
	warehouse_id: "principal",
	movement_type: "out" as const,
	quantity: 1,
	previous_quantity: 10,
	new_quantity: 9,
	reason: `Venta ${saleId}`,
	performed_by_user_id: userId,
	created_at: "2026-01-01T12:00:00Z",
};

function mockCashierMembership(activeBusinessId = businessId) {
	mocks.requireBusinessRole.mockResolvedValue({
		role: "cashier",
		roleSource: "membership",
		business: {
			businessId: activeBusinessId,
			userId,
			businessSlug: "default",
			businessName: "Test",
			membershipId: "m-1",
			role: "cashier",
		},
		user: { id: userId, role: "cashier", email: "c@test.com", name: "Cajero" },
	});
}

function setupFullReceiptQueries(options?: {
	sale?: typeof saleRow | null;
	receiptSale?: typeof saleRow | null;
}) {
	const sale = options?.sale === undefined ? saleRow : options.sale;
	const receiptSale =
		options?.receiptSale === undefined ? sale : options.receiptSale;

	mocks.query.mockImplementation(async (sql: string, params?: unknown[]) => {
		const normalized = sql.replace(/\s+/g, " ").trim();

		if (
			normalized.includes("FROM sales") &&
			normalized.includes("AND id = $2")
		) {
			return { rows: sale ? [sale] : [] };
		}

		if (
			normalized.includes("FROM sales") &&
			normalized.includes("AND receipt_number = $2")
		) {
			return { rows: receiptSale ? [receiptSale] : [] };
		}

		if (normalized.includes("FROM sale_items")) {
			return { rows: sale ? [saleItemRow] : [] };
		}

		if (normalized.includes("FROM sale_payments")) {
			return { rows: sale ? [paymentRow] : [] };
		}

		if (normalized.includes("FROM cash_sessions")) {
			return { rows: sale ? [cashSessionRow] : [] };
		}

		if (normalized.includes("FROM stock_movements")) {
			return { rows: sale ? [stockMovementRow] : [] };
		}

		if (
			normalized.includes("FROM sales") &&
			normalized.includes("ORDER BY created_at DESC")
		) {
			return { rows: [saleRow] };
		}

		throw new Error(
			`Unhandled SQL in test: ${normalized} params=${String(params)}`,
		);
	});
}

describe("sale-read-model.server (tenant-aware read)", () => {
	afterEach(() => {
		vi.resetAllMocks();
	});

	it("loads full receipt by sale id", async () => {
		mockCashierMembership();
		setupFullReceiptQueries();

		const receipt = await getSaleReceiptByIdForPos(saleId);

		expect(receipt.sale.id).toBe(saleId);
		expect(receipt.items).toHaveLength(1);
		expect(receipt.payments).toHaveLength(1);
		expect(receipt.cash_session.id).toBe(sessionId);
		expect(receipt.stock_movements).toHaveLength(1);
		expect(mocks.requireBusinessRole).toHaveBeenCalled();
	});

	it("loads full receipt by receipt_number", async () => {
		mockCashierMembership();
		setupFullReceiptQueries();

		const receipt = await getSaleReceiptByReceiptNumberForPos(42);

		expect(receipt.sale.receipt_number).toBe(42);
		expect(receipt.payments[0]?.amount).toBe(10);
	});

	it("lists recent sales for the active business", async () => {
		mockCashierMembership();
		setupFullReceiptQueries();

		const recent = await listRecentSalesForPos({ limit: 10 });

		expect(recent).toHaveLength(1);
		expect(recent[0]).toMatchObject({
			id: saleId,
			receipt_number: 42,
			total: 10,
		});
	});

	it("does not return sales from another business", async () => {
		mockCashierMembership(businessId);
		setupFullReceiptQueries({ sale: null });

		await expect(getSaleReceiptByIdForPos(saleId)).rejects.toMatchObject({
			code: SALES_TX_ERROR_CODES.SALE_NOT_FOUND,
		});

		const findByIdCall = mocks.query.mock.calls.find(
			([sql]) =>
				String(sql).includes("FROM sales") &&
				String(sql).includes("business_id = $1"),
		);
		expect(findByIdCall?.[1]).toEqual([businessId, saleId]);
	});

	it("allows cashier role", async () => {
		mockCashierMembership();
		setupFullReceiptQueries();

		await expect(getSaleReceiptByIdForPos(saleId)).resolves.toBeDefined();
		expect(mocks.requireBusinessRole).toHaveBeenCalledWith([
			"owner",
			"admin",
			"manager",
			"cashier",
		]);
	});

	it("rejects when sale does not exist", async () => {
		mockCashierMembership();
		setupFullReceiptQueries({ sale: null });

		await expect(
			getSaleReceiptByIdForPos("missing-sale"),
		).rejects.toMatchObject({
			code: SALES_TX_ERROR_CODES.SALE_NOT_FOUND,
		});
	});

	it("rejects invalid receipt number", async () => {
		mockCashierMembership();

		await expect(getSaleReceiptByReceiptNumberForPos(0)).rejects.toMatchObject({
			code: SALES_TX_ERROR_CODES.VALIDATION,
		});
	});
});
