import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	requireBusinessRole: vi.fn(),
	resolveDefaultBusinessContext: vi.fn(),
	requireOpenCashSessionForPos: vi.fn(),
	executeFinalizeSaleCommand: vi.fn(),
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

vi.mock("./cash-session-access.server", () => ({
	requireOpenCashSessionForPos: mocks.requireOpenCashSessionForPos,
}));

vi.mock("./transaction/finalize-sale-command.server", () => ({
	executeFinalizeSaleCommand: mocks.executeFinalizeSaleCommand,
}));

import { finalizeSale } from "./finalize-sale-access.server";
import { SALES_TX_ERROR_CODES } from "./transaction/errors";

const businessId = "biz-1";
const userId = "user-1";
const sessionId = "sess-1";
const productId = "00000000-0000-4000-8000-000000000001";

const baseInput = {
	client_request_id: "req-1",
	cash_session_id: sessionId,
	warehouse_id: "principal",
	payment_method: "cash" as const,
	lines: [
		{
			product_id: productId,
			product_name: "Café",
			quantity: 1,
			unit_price: 5,
			discount_percent: 0,
		},
	],
};

const openSession = {
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

const saleResult = {
	sale_id: "sale-1",
	receipt_number: 42,
	status: "completed" as const,
	total: 5,
	idempotency_key: "sale:v1:biz-1:finalize_sale:req-1",
	payment: {
		payment_id: "pay-1",
		payment_method: "cash" as const,
		amount: 5,
		currency: "EUR",
		status: "completed" as const,
		provider: "internal" as const,
	},
};

describe("finalize-sale-access.server (Fase C1)", () => {
	afterEach(() => {
		vi.resetAllMocks();
	});

	function mockCashierMembership() {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "cashier",
			roleSource: "membership",
			business: {
				businessId,
				userId,
				businessSlug: "default",
				businessName: "Test",
				membershipId: "m-1",
				role: "cashier",
			},
			user: {
				id: userId,
				role: "cashier",
				email: "c@test.com",
				name: "Cajero",
			},
		});
	}

	it("finalizes a sale when session is open", async () => {
		mockCashierMembership();
		mocks.requireOpenCashSessionForPos.mockResolvedValue(openSession);
		mocks.executeFinalizeSaleCommand.mockResolvedValue(saleResult);

		await expect(finalizeSale(baseInput)).resolves.toEqual(saleResult);

		expect(mocks.requireOpenCashSessionForPos).toHaveBeenCalledWith({
			cash_session_id: sessionId,
		});
		expect(mocks.executeFinalizeSaleCommand).toHaveBeenCalledWith(
			expect.objectContaining({
				business_id: businessId,
				user_id: userId,
				cash_session_id: sessionId,
				warehouse_id: "principal",
				idempotency_key: "sale:v1:biz-1:finalize_sale:req-1",
			}),
		);
	});

	it("returns the same sale on duplicate client_request_id", async () => {
		mockCashierMembership();
		mocks.requireOpenCashSessionForPos.mockResolvedValue(openSession);
		mocks.executeFinalizeSaleCommand.mockResolvedValue(saleResult);

		await expect(finalizeSale(baseInput)).resolves.toEqual(saleResult);
		await expect(
			finalizeSale({ ...baseInput, client_request_id: "req-1" }),
		).resolves.toEqual(saleResult);

		expect(mocks.executeFinalizeSaleCommand).toHaveBeenCalledTimes(2);
		expect(
			mocks.executeFinalizeSaleCommand.mock.calls[0]?.[0].idempotency_key,
		).toBe(mocks.executeFinalizeSaleCommand.mock.calls[1]?.[0].idempotency_key);
	});

	it("rejects finalize without open cash session", async () => {
		mockCashierMembership();
		const { SalesTransactionError } = await import("./transaction/errors");
		mocks.requireOpenCashSessionForPos.mockRejectedValue(
			new SalesTransactionError(
				SALES_TX_ERROR_CODES.CASH_SESSION_NOT_OPEN,
				"No hay sesión de caja abierta.",
			),
		);

		await expect(finalizeSale(baseInput)).rejects.toMatchObject({
			code: SALES_TX_ERROR_CODES.CASH_SESSION_NOT_OPEN,
		});
		expect(mocks.executeFinalizeSaleCommand).not.toHaveBeenCalled();
	});

	it("allows cashier role", async () => {
		mockCashierMembership();
		mocks.requireOpenCashSessionForPos.mockResolvedValue(openSession);
		mocks.executeFinalizeSaleCommand.mockResolvedValue(saleResult);

		await expect(finalizeSale(baseInput)).resolves.toEqual(saleResult);
		expect(mocks.requireBusinessRole).toHaveBeenCalled();
	});

	it("rejects empty lines", async () => {
		mockCashierMembership();

		await expect(
			finalizeSale({ ...baseInput, lines: [] }),
		).rejects.toMatchObject({
			code: SALES_TX_ERROR_CODES.VALIDATION,
		});
	});
});
