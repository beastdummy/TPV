import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	requireBusinessRole: vi.fn(),
	resolveDefaultBusinessContext: vi.fn(),
	requireOpenCashSessionForPos: vi.fn(),
	executeFinalizeSaleCommand: vi.fn(),
	resolvePosOperatorForFinalize: vi.fn(),
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

vi.mock("../pos-session/pos-session-access.server", () => ({
	resolvePosOperatorForFinalize: mocks.resolvePosOperatorForFinalize,
	recordPosAuditEvent: vi.fn(),
}));

vi.mock("../pos-session/audit-events", () => ({
	POS_AUDIT_EVENTS: { SALE_FINALIZE: "pos.sale.finalize" },
	recordPosAuditEvent: vi.fn(),
}));

vi.mock("./transaction/finalize-sale-command.server", () => ({
	executeFinalizeSaleCommand: mocks.executeFinalizeSaleCommand,
}));

vi.mock("../business-setup/setup-audit-hooks.server", () => ({
	auditSaleFinalized: vi.fn(),
}));

import { finalizeSale } from "./finalize-sale-access.server";
import { SALES_TX_ERROR_CODES } from "./transaction/errors";

const businessId = "biz-1";
const userId = "user-1";
const membershipId = "mem-cashier-1";
const sessionId = "sess-1";
const productId = "00000000-0000-4000-8000-000000000001";
const operatorToken = "operator-token-test";

const baseInput = {
	client_request_id: "req-1",
	cash_session_id: sessionId,
	warehouse_id: "principal",
	payment_method: "cash" as const,
	operator_token: operatorToken,
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

	function mockPosOperator() {
		mocks.resolvePosOperatorForFinalize.mockResolvedValue({
			membershipId,
			userId,
			roleSlug: "cashier",
			displayName: "Cajero",
			sessionId: "pos-sess-1",
		});
	}

	it("finalizes a sale when session is open", async () => {
		mockCashierMembership();
		mockPosOperator();
		mocks.requireOpenCashSessionForPos.mockResolvedValue(openSession);
		mocks.executeFinalizeSaleCommand.mockResolvedValue(saleResult);

		await expect(finalizeSale(baseInput)).resolves.toEqual(saleResult);

		expect(mocks.executeFinalizeSaleCommand).toHaveBeenCalledWith(
			expect.objectContaining({
				business_id: businessId,
				user_id: userId,
				served_by_membership_id: membershipId,
			}),
		);
	});

	it("rejects finalize without operator token", async () => {
		mockCashierMembership();

		await expect(
			finalizeSale({ ...baseInput, operator_token: "" }),
		).rejects.toMatchObject({
			code: SALES_TX_ERROR_CODES.POS_OPERATOR_REQUIRED,
		});
	});

	it("rejects when POS operator session is missing", async () => {
		mockCashierMembership();
		mocks.requireOpenCashSessionForPos.mockResolvedValue(openSession);
		const { SalesTransactionError } = await import("./transaction/errors");
		mocks.resolvePosOperatorForFinalize.mockRejectedValue(
			new SalesTransactionError(
				SALES_TX_ERROR_CODES.POS_OPERATOR_REQUIRED,
				"Desbloquea el TPV con tu PIN antes de operar.",
			),
		);

		await expect(finalizeSale(baseInput)).rejects.toMatchObject({
			code: SALES_TX_ERROR_CODES.POS_OPERATOR_REQUIRED,
		});
	});
});
