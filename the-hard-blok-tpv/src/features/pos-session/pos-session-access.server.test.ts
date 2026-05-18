import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	resolvePosBusinessContext: vi.fn(),
	verifyPosPinForTerminal: vi.fn(),
	lockActiveSessionsForTerminal: vi.fn(),
	insertPosOperatorSession: vi.fn(),
	buildOperatorPermissions: vi.fn(),
	getPosOperatorSessionById: vi.fn(),
	touchPosOperatorSession: vi.fn(),
	lockPosOperatorSessionById: vi.fn(),
}));

vi.mock("../sales/sales-access.server", () => ({
	resolvePosBusinessContext: mocks.resolvePosBusinessContext,
}));

vi.mock("./pin-verify.server", () => ({
	verifyPosPinForTerminal: mocks.verifyPosPinForTerminal,
}));

vi.mock("./queries.server", () => ({
	lockActiveSessionsForTerminal: mocks.lockActiveSessionsForTerminal,
	insertPosOperatorSession: mocks.insertPosOperatorSession,
	getPosOperatorSessionById: mocks.getPosOperatorSessionById,
	touchPosOperatorSession: mocks.touchPosOperatorSession,
	lockPosOperatorSessionById: mocks.lockPosOperatorSessionById,
	isSessionActive: (row: { status: string }) => row.status === "active",
}));

vi.mock("./operator-permissions.server", () => ({
	buildOperatorPermissions: mocks.buildOperatorPermissions,
}));

vi.mock("./audit-events", () => ({
	POS_AUDIT_EVENTS: {
		OPERATOR_UNLOCK: "pos.operator.unlock",
		OPERATOR_LOCK: "pos.operator.lock",
		OPERATOR_SWITCH: "pos.operator.switch",
	},
	recordPosAuditEvent: vi.fn(),
}));

import {
	getActivePosOperatorAccess,
	lockPosTerminalAccess,
	switchPosOperatorAccess,
	verifyPosPinForTerminalAccess,
} from "./pos-session-access.server";
import { createPosSessionToken } from "./session-token.server";

const businessId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const terminalId = "tpv-1";

describe("pos-session-access.server", () => {
	afterEach(() => {
		vi.clearAllMocks();
		process.env.POS_OPERATOR_TOKEN_SECRET = "test-secret";
	});

	it("owner unlocks terminal with PIN", async () => {
		mocks.resolvePosBusinessContext.mockResolvedValue({ businessId });
		mocks.verifyPosPinForTerminal.mockResolvedValue({
			membership_id: "mem-owner",
			user_id: "user-owner",
			role_slug: "owner",
			display_name: "Owner",
		});
		mocks.insertPosOperatorSession.mockResolvedValue({
			id: "sess-1",
			business_id: businessId,
			terminal_id: terminalId,
			operator_member_id: "mem-owner",
			operator_user_id: "user-owner",
			operator_name: "Owner",
			operator_role: "owner",
			status: "active",
			started_at: "2026-01-01T10:00:00Z",
			last_seen_at: "2026-01-01T10:00:00Z",
			locked_at: null,
		});
		mocks.buildOperatorPermissions.mockResolvedValue({
			"sales.view": true,
			"sales.manage": true,
		});

		const result = await verifyPosPinForTerminalAccess({
			pin: "1234",
			terminal_id: terminalId,
		});

		expect(result.operator_name).toBe("Owner");
		expect(result.permissions["sales.manage"]).toBe(true);
		expect(mocks.lockActiveSessionsForTerminal).toHaveBeenCalled();
	});

	it("switch operator locks previous session", async () => {
		mocks.resolvePosBusinessContext.mockResolvedValue({ businessId });
		mocks.verifyPosPinForTerminal.mockResolvedValue({
			membership_id: "mem-2",
			user_id: "user-2",
			role_slug: "cashier",
			display_name: "Camarero",
		});
		mocks.insertPosOperatorSession.mockResolvedValue({
			id: "sess-2",
			business_id: businessId,
			terminal_id: terminalId,
			operator_member_id: "mem-2",
			operator_user_id: "user-2",
			operator_name: "Camarero",
			operator_role: "cashier",
			status: "active",
			started_at: "2026-01-01T10:00:00Z",
			last_seen_at: "2026-01-01T10:00:00Z",
			locked_at: null,
		});
		mocks.buildOperatorPermissions.mockResolvedValue({
			"sales.view": true,
			"sales.manage": true,
		});

		const prevToken = createPosSessionToken({
			sessionId: "sess-1",
			businessId,
			terminalId,
		});

		await switchPosOperatorAccess({
			pin: "5678",
			terminal_id: terminalId,
			operator_token: prevToken,
		});

		expect(mocks.lockPosOperatorSessionById).toHaveBeenCalledWith("sess-1");
	});

	it("getActivePosOperator returns null for locked session", async () => {
		mocks.resolvePosBusinessContext.mockResolvedValue({ businessId });
		const token = createPosSessionToken({
			sessionId: "sess-1",
			businessId,
			terminalId,
		});
		mocks.getPosOperatorSessionById.mockResolvedValue({
			id: "sess-1",
			business_id: businessId,
			terminal_id: terminalId,
			operator_member_id: "mem-1",
			operator_user_id: "user-1",
			operator_name: "Test",
			operator_role: "cashier",
			status: "locked",
			started_at: "2026-01-01T10:00:00Z",
			last_seen_at: "2026-01-01T10:00:00Z",
			locked_at: "2026-01-01T11:00:00Z",
		});

		await expect(
			getActivePosOperatorAccess({ operator_token: token }),
		).resolves.toBeNull();
	});

	it("lockPosTerminal locks active sessions", async () => {
		mocks.resolvePosBusinessContext.mockResolvedValue({ businessId });

		await lockPosTerminalAccess({ terminal_id: terminalId });

		expect(mocks.lockActiveSessionsForTerminal).toHaveBeenCalledWith({
			businessId,
			terminalId,
		});
	});
});
