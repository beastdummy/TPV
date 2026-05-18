import { resolvePosBusinessContext } from "./sales-access.server";
import {
	SALES_TX_ERROR_CODES,
	SalesTransactionError,
} from "./transaction/errors";
import type { CashSessionRow } from "./transaction/schema-types";

const DEFAULT_TERMINAL_ID = "default";

function normalizeTerminalId(terminalId: string | undefined) {
	const value = terminalId?.trim();
	return value && value.length > 0 ? value : DEFAULT_TERMINAL_ID;
}

function isUniqueViolation(error: unknown) {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code: string }).code === "23505"
	);
}

export type OpenCashSessionForPosInput = {
	terminal_id?: string;
	opening_float?: number;
	notes?: string;
};

export type CloseCashSessionForPosInput = {
	cash_session_id: string;
	closing_amount: number;
	notes?: string;
};

export type CashSessionMutationInput = {
	cash_session_id: string;
	notes?: string;
};

export type RequireOpenCashSessionInput = {
	terminal_id?: string;
	cash_session_id?: string;
};

export type GetActiveCashSessionForPosInput = {
	terminal_id?: string;
};

export async function openCashSessionForPos(
	input: OpenCashSessionForPosInput = {},
): Promise<CashSessionRow> {
	const { businessId, userId } = await resolvePosBusinessContext();
	const terminalId = normalizeTerminalId(input.terminal_id);
	const openingFloat = input.opening_float ?? 0;

	if (openingFloat < 0) {
		throw new SalesTransactionError(
			SALES_TX_ERROR_CODES.VALIDATION,
			"El fondo inicial no puede ser negativo.",
		);
	}

	const { findOpenCashSession, insertCashSession } = await import(
		"./cash-session-queries.server"
	);

	const existing = await findOpenCashSession(businessId, terminalId);
	if (existing) {
		throw new SalesTransactionError(
			SALES_TX_ERROR_CODES.CASH_SESSION_ALREADY_OPEN,
			"Ya existe una sesión de caja abierta en este terminal.",
		);
	}

	try {
		return await insertCashSession({
			business_id: businessId,
			terminal_id: terminalId,
			opening_float: openingFloat,
			opened_by_user_id: userId,
			notes: input.notes?.trim() ?? "",
		});
	} catch (error) {
		if (isUniqueViolation(error)) {
			throw new SalesTransactionError(
				SALES_TX_ERROR_CODES.CASH_SESSION_ALREADY_OPEN,
				"Ya existe una sesión de caja abierta en este terminal.",
			);
		}
		throw error;
	}
}

export async function getActiveCashSessionForPos(
	input: GetActiveCashSessionForPosInput = {},
): Promise<CashSessionRow | null> {
	const { businessId } = await resolvePosBusinessContext();
	const terminalId = normalizeTerminalId(input.terminal_id);
	const { findOpenCashSession } = await import("./cash-session-queries.server");
	return await findOpenCashSession(businessId, terminalId);
}

/**
 * Exige sesión de caja abierta antes de operaciones de venta (finalizeSale, Fase C).
 */
export async function requireOpenCashSessionForPos(
	input: RequireOpenCashSessionInput = {},
): Promise<CashSessionRow> {
	const { businessId } = await resolvePosBusinessContext();
	const { findOpenCashSession, getCashSessionById } = await import(
		"./cash-session-queries.server"
	);

	if (input.cash_session_id) {
		const session = await getCashSessionById(businessId, input.cash_session_id);
		if (!session) {
			throw new SalesTransactionError(
				SALES_TX_ERROR_CODES.CASH_SESSION_NOT_FOUND,
				"Sesión de caja no encontrada.",
			);
		}
		if (session.status !== "open") {
			throw new SalesTransactionError(
				SALES_TX_ERROR_CODES.CASH_SESSION_NOT_OPEN,
				"No hay sesión de caja abierta para registrar ventas.",
			);
		}
		return session;
	}

	const terminalId = normalizeTerminalId(input.terminal_id);
	const session = await findOpenCashSession(businessId, terminalId);
	if (!session) {
		throw new SalesTransactionError(
			SALES_TX_ERROR_CODES.CASH_SESSION_NOT_OPEN,
			"No hay sesión de caja abierta. Abre caja antes de vender.",
		);
	}

	return session;
}

export async function closeCashSessionForPos(
	input: CloseCashSessionForPosInput,
): Promise<CashSessionRow> {
	const { businessId, userId } = await resolvePosBusinessContext();

	if (input.closing_amount < 0) {
		throw new SalesTransactionError(
			SALES_TX_ERROR_CODES.VALIDATION,
			"El arqueo de cierre no puede ser negativo.",
		);
	}

	const {
		getCashSessionById,
		hasPendingSalesForSession,
		updateCashSessionStatus,
	} = await import("./cash-session-queries.server");

	const session = await getCashSessionById(businessId, input.cash_session_id);
	if (!session) {
		throw new SalesTransactionError(
			SALES_TX_ERROR_CODES.CASH_SESSION_NOT_FOUND,
			"Sesión de caja no encontrada.",
		);
	}

	if (session.status === "closed" || session.status === "suspended") {
		throw new SalesTransactionError(
			SALES_TX_ERROR_CODES.CASH_SESSION_CLOSED,
			"La sesión de caja ya está cerrada.",
		);
	}

	if (session.status !== "open" && session.status !== "closing") {
		throw new SalesTransactionError(
			SALES_TX_ERROR_CODES.CASH_SESSION_NOT_OPEN,
			"La sesión de caja no está abierta.",
		);
	}

	if (await hasPendingSalesForSession(session.id)) {
		throw new SalesTransactionError(
			SALES_TX_ERROR_CODES.CASH_SESSION_PENDING_SALES,
			"No se puede cerrar la caja con ventas pendientes.",
		);
	}

	return await updateCashSessionStatus({
		business_id: businessId,
		cash_session_id: session.id,
		status: "closed",
		closed_by_user_id: userId,
		closing_amount: input.closing_amount,
		notes: input.notes,
	});
}

export async function suspendCashSessionForPos(
	input: CashSessionMutationInput,
): Promise<CashSessionRow> {
	const { businessId, userId } = await resolvePosBusinessContext();
	const {
		getCashSessionById,
		hasPendingSalesForSession,
		updateCashSessionStatus,
	} = await import("./cash-session-queries.server");

	const session = await getCashSessionById(businessId, input.cash_session_id);
	if (!session) {
		throw new SalesTransactionError(
			SALES_TX_ERROR_CODES.CASH_SESSION_NOT_FOUND,
			"Sesión de caja no encontrada.",
		);
	}

	if (session.status !== "open") {
		throw new SalesTransactionError(
			SALES_TX_ERROR_CODES.CASH_SESSION_NOT_OPEN,
			"Solo se puede suspender una sesión abierta.",
		);
	}

	if (await hasPendingSalesForSession(session.id)) {
		throw new SalesTransactionError(
			SALES_TX_ERROR_CODES.CASH_SESSION_PENDING_SALES,
			"No se puede suspender la caja con ventas pendientes.",
		);
	}

	return await updateCashSessionStatus({
		business_id: businessId,
		cash_session_id: session.id,
		status: "suspended",
		closed_by_user_id: userId,
		notes: input.notes,
	});
}
