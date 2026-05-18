import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	requireBusinessRole: vi.fn(),
	resolveDefaultBusinessContext: vi.fn(),
	findOpenCashSession: vi.fn(),
	insertCashSession: vi.fn(),
	getCashSessionById: vi.fn(),
	updateCashSessionStatus: vi.fn(),
	hasPendingSalesForSession: vi.fn(),
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

vi.mock("./cash-session-queries.server", () => ({
	findOpenCashSession: mocks.findOpenCashSession,
	insertCashSession: mocks.insertCashSession,
	getCashSessionById: mocks.getCashSessionById,
	updateCashSessionStatus: mocks.updateCashSessionStatus,
	hasPendingSalesForSession: mocks.hasPendingSalesForSession,
}));

import {
	closeCashSessionForPos,
	getActiveCashSessionForPos,
	openCashSessionForPos,
	requireOpenCashSessionForPos,
} from "./cash-session-access.server";
import { SALES_TX_ERROR_CODES } from "./transaction/errors";

const businessId = "biz-1";
const userId = "user-1";
const sessionId = "sess-1";
const terminalId = "tpv-1";

function openSession(overrides: Partial<typeof baseOpenSession> = {}) {
	return { ...baseOpenSession, ...overrides };
}

const baseOpenSession = {
	id: sessionId,
	business_id: businessId,
	terminal_id: terminalId,
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

describe("cash-session-access.server (tenant-aware)", () => {
	afterEach(() => {
		vi.resetAllMocks();
	});

	function mockMembership(role: "owner" | "cashier" = "owner") {
		mocks.requireBusinessRole.mockResolvedValue({
			role,
			roleSource: "membership",
			business: {
				businessId,
				userId,
				businessSlug: "default",
				businessName: "Test",
				membershipId: "m-1",
				role,
			},
			user: { id: userId, role, email: "a@test.com", name: "Ada" },
		});
	}

	it("runs full cash session lifecycle (open → active → close)", async () => {
		mockMembership("cashier");
		mocks.findOpenCashSession
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(openSession())
			.mockResolvedValueOnce(openSession());
		mocks.insertCashSession.mockResolvedValue(openSession());
		mocks.getCashSessionById.mockResolvedValue(openSession());
		mocks.hasPendingSalesForSession.mockResolvedValue(false);
		mocks.updateCashSessionStatus.mockResolvedValue(
			openSession({
				status: "closed",
				closing_amount: 150,
				closed_by_user_id: userId,
				closed_at: "2026-01-01T18:00:00Z",
			}),
		);

		const opened = await openCashSessionForPos({
			opening_float: 100,
			terminal_id: terminalId,
		});
		expect(opened.status).toBe("open");

		const active = await getActiveCashSessionForPos({
			terminal_id: terminalId,
		});
		expect(active?.id).toBe(sessionId);

		const closed = await closeCashSessionForPos({
			cash_session_id: sessionId,
			closing_amount: 150,
		});
		expect(closed).toMatchObject({
			status: "closed",
			closing_amount: 150,
		});
	});

	it("allows cashier to open cash session", async () => {
		mockMembership("cashier");
		mocks.findOpenCashSession.mockResolvedValue(null);
		mocks.insertCashSession.mockResolvedValue(openSession());

		await expect(
			openCashSessionForPos({ opening_float: 100, terminal_id: terminalId }),
		).resolves.toEqual(openSession());

		expect(mocks.insertCashSession).toHaveBeenCalledWith({
			business_id: businessId,
			terminal_id: terminalId,
			opening_float: 100,
			opened_by_user_id: userId,
			notes: "",
		});
	});

	it("blocks double open session on same terminal", async () => {
		mockMembership();
		mocks.findOpenCashSession.mockResolvedValue(openSession());

		await expect(
			openCashSessionForPos({ terminal_id: terminalId }),
		).rejects.toMatchObject({
			code: SALES_TX_ERROR_CODES.CASH_SESSION_ALREADY_OPEN,
		});
		expect(mocks.insertCashSession).not.toHaveBeenCalled();
	});

	it("requires closing_amount on close", async () => {
		mockMembership();
		mocks.getCashSessionById.mockResolvedValue(openSession());
		mocks.hasPendingSalesForSession.mockResolvedValue(false);
		mocks.updateCashSessionStatus.mockResolvedValue(
			openSession({ status: "closed", closing_amount: 100 }),
		);

		await expect(
			closeCashSessionForPos({
				cash_session_id: sessionId,
				closing_amount: 100,
			}),
		).resolves.toMatchObject({ closing_amount: 100 });

		expect(mocks.updateCashSessionStatus).toHaveBeenCalledWith(
			expect.objectContaining({
				closing_amount: 100,
				status: "closed",
			}),
		);
	});

	it("blocks sale without open cash session", async () => {
		mockMembership();
		mocks.findOpenCashSession.mockResolvedValue(null);

		await expect(
			requireOpenCashSessionForPos({ terminal_id: terminalId }),
		).rejects.toMatchObject({
			code: SALES_TX_ERROR_CODES.CASH_SESSION_NOT_OPEN,
		});
	});

	it("allows sale guard when session is open", async () => {
		mockMembership();
		mocks.getCashSessionById.mockResolvedValue(openSession());

		await expect(
			requireOpenCashSessionForPos({ cash_session_id: sessionId }),
		).resolves.toEqual(openSession());
	});

	it("blocks unauthorized user", async () => {
		mocks.requireBusinessRole.mockRejectedValue(new Error("UNAUTHORIZED"));

		await expect(openCashSessionForPos()).rejects.toThrow("UNAUTHORIZED");
	});

	it("uses legacy fallback with default business context", async () => {
		mocks.requireBusinessRole.mockResolvedValue({
			role: "manager",
			roleSource: "legacy",
			business: null,
			user: { id: userId, role: "manager", email: "m@test.com", name: "M" },
		});
		mocks.resolveDefaultBusinessContext.mockResolvedValue({
			businessId,
			userId,
			businessSlug: "default",
			businessName: "Test",
			membershipId: "m-1",
			role: "manager",
		});
		mocks.findOpenCashSession.mockResolvedValue(null);
		mocks.insertCashSession.mockResolvedValue(openSession());

		await expect(openCashSessionForPos()).resolves.toEqual(openSession());
		expect(mocks.resolveDefaultBusinessContext).toHaveBeenCalledWith(userId);
	});
});
