import { resolvePosBusinessContext } from "../sales/sales-access.server";
import {
	SALES_TX_ERROR_CODES,
	SalesTransactionError,
} from "../sales/transaction/errors";
import { POS_AUDIT_EVENTS, recordPosAuditEvent } from "./audit-events";
import { buildOperatorPermissions } from "./operator-permissions.server";
import { verifyPosPinForTerminal } from "./pin-verify.server";
import {
	getPosOperatorSessionById,
	insertPosOperatorSession,
	isSessionActive,
	lockActiveSessionsForTerminal,
	lockPosOperatorSessionById,
	touchPosOperatorSession,
} from "./queries.server";
import {
	createPosSessionToken,
	verifyPosSessionToken,
} from "./session-token.server";
import type { ActivePosOperator } from "./types";

function toActiveOperator(
	row: {
		id: string;
		business_id: string;
		terminal_id: string;
		operator_member_id: string;
		operator_user_id: string;
		operator_name: string;
		operator_role: string;
		started_at: string;
	},
	token: string,
	permissions: ActivePosOperator["permissions"],
): ActivePosOperator {
	return {
		session_id: row.id,
		token,
		terminal_id: row.terminal_id,
		business_id: row.business_id,
		operator_member_id: row.operator_member_id,
		operator_user_id: row.operator_user_id,
		operator_name: row.operator_name,
		role: row.operator_role,
		permissions,
		started_at: row.started_at,
	};
}

async function startOperatorSession(input: {
	businessId: string;
	terminalId: string;
	operator: {
		membership_id: string;
		user_id: string;
		role_slug: string;
		display_name: string;
	};
	auditEvent: (typeof POS_AUDIT_EVENTS)[keyof typeof POS_AUDIT_EVENTS];
}): Promise<ActivePosOperator> {
	await lockActiveSessionsForTerminal({
		businessId: input.businessId,
		terminalId: input.terminalId,
	});

	const row = await insertPosOperatorSession({
		businessId: input.businessId,
		terminalId: input.terminalId,
		operatorMemberId: input.operator.membership_id,
		operatorUserId: input.operator.user_id,
		operatorName: input.operator.display_name,
		operatorRole: input.operator.role_slug,
	});

	const token = createPosSessionToken({
		sessionId: row.id,
		businessId: input.businessId,
		terminalId: input.terminalId,
	});

	const permissions = await buildOperatorPermissions(
		input.businessId,
		input.operator.role_slug,
	);

	recordPosAuditEvent(input.auditEvent, {
		business_id: input.businessId,
		terminal_id: input.terminalId,
		operator_member_id: input.operator.membership_id,
		operator_user_id: input.operator.user_id,
		operator_name: input.operator.display_name,
	});

	return toActiveOperator(row, token, permissions);
}

export async function verifyPosPinForTerminalAccess(input: {
	pin: string;
	terminal_id: string;
	email?: string;
}): Promise<ActivePosOperator> {
	const { businessId } = await resolvePosBusinessContext();
	const terminalId = input.terminal_id.trim() || "default";

	const operator = await verifyPosPinForTerminal({
		businessId,
		terminalId,
		pin: input.pin,
		email: input.email,
	});

	return await startOperatorSession({
		businessId,
		terminalId,
		operator,
		auditEvent: POS_AUDIT_EVENTS.OPERATOR_UNLOCK,
	});
}

export async function switchPosOperatorAccess(input: {
	pin: string;
	terminal_id: string;
	email?: string;
	operator_token?: string;
}): Promise<ActivePosOperator> {
	if (input.operator_token) {
		await lockPosTerminalAccess({
			terminal_id: input.terminal_id,
			operator_token: input.operator_token,
		});
	}

	return await verifyPosPinForTerminalAccess({
		pin: input.pin,
		terminal_id: input.terminal_id,
		email: input.email,
	});
}

export async function getActivePosOperatorAccess(input: {
	operator_token: string;
	terminal_id?: string;
}): Promise<ActivePosOperator | null> {
	const { businessId } = await resolvePosBusinessContext();
	const payload = verifyPosSessionToken(input.operator_token);

	if (!payload || payload.businessId !== businessId) {
		return null;
	}

	if (input.terminal_id && payload.terminalId !== input.terminal_id.trim()) {
		return null;
	}

	const row = await getPosOperatorSessionById({
		businessId,
		sessionId: payload.sessionId,
	});

	if (!row || !isSessionActive(row)) {
		return null;
	}

	await touchPosOperatorSession(row.id);

	const permissions = await buildOperatorPermissions(
		businessId,
		row.operator_role,
	);

	return toActiveOperator(row, input.operator_token.trim(), permissions);
}

export async function lockPosTerminalAccess(input: {
	terminal_id: string;
	operator_token?: string;
}) {
	const { businessId } = await resolvePosBusinessContext();
	const terminalId = input.terminal_id.trim() || "default";

	if (input.operator_token) {
		const payload = verifyPosSessionToken(input.operator_token);
		if (payload?.sessionId) {
			await lockPosOperatorSessionById(payload.sessionId);
			recordPosAuditEvent(POS_AUDIT_EVENTS.OPERATOR_LOCK, {
				business_id: businessId,
				terminal_id: terminalId,
				operator_member_id: undefined,
			});
			return { ok: true as const };
		}
	}

	await lockActiveSessionsForTerminal({ businessId, terminalId });
	recordPosAuditEvent(POS_AUDIT_EVENTS.OPERATOR_LOCK, {
		business_id: businessId,
		terminal_id: terminalId,
	});

	return { ok: true as const };
}

export type ResolvedPosOperator = {
	membershipId: string;
	userId: string;
	roleSlug: string;
	displayName: string;
	sessionId: string;
};

export async function resolvePosOperatorForFinalize(input: {
	operator_token: string;
	businessId: string;
	terminalId: string;
}): Promise<ResolvedPosOperator> {
	const operator = await getActivePosOperatorAccess({
		operator_token: input.operator_token,
		terminal_id: input.terminalId,
	});

	if (!operator) {
		throw new SalesTransactionError(
			SALES_TX_ERROR_CODES.POS_OPERATOR_REQUIRED,
			"Desbloquea el TPV con tu PIN antes de operar.",
		);
	}

	if (!operator.permissions["sales.manage"]) {
		throw new SalesTransactionError(
			SALES_TX_ERROR_CODES.FORBIDDEN,
			"No tienes permiso para cobrar en el TPV.",
		);
	}

	return {
		membershipId: operator.operator_member_id,
		userId: operator.operator_user_id,
		roleSlug: operator.role,
		displayName: operator.operator_name,
		sessionId: operator.session_id,
	};
}
