import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const terminalSchema = z.object({
	terminal_id: z.string().trim().min(1).max(80).optional(),
});

const openCashSessionSchema = terminalSchema.extend({
	opening_float: z.number().min(0).optional(),
	notes: z.string().trim().max(500).optional(),
});

const closeCashSessionSchema = z.object({
	cash_session_id: z.string().trim().uuid(),
	closing_amount: z.number().min(0),
	notes: z.string().trim().max(500).optional(),
});

const cashSessionIdSchema = z.object({
	cash_session_id: z.string().trim().uuid(),
	notes: z.string().trim().max(500).optional(),
});

/** Abre sesión de caja — tenant-aware (una open por terminal). */
export const openCashSessionForPosFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => openCashSessionSchema.parse(data ?? {}))
	.handler(async ({ data }) => {
		const { openCashSessionForPos } = await import(
			"./cash-session-access.server"
		);
		return await openCashSessionForPos(data);
	});

/** Cierra sesión de caja — tenant-aware. */
export const closeCashSessionForPosFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => closeCashSessionSchema.parse(data))
	.handler(async ({ data }) => {
		const { closeCashSessionForPos } = await import(
			"./cash-session-access.server"
		);
		return await closeCashSessionForPos(data);
	});

/** Suspende sesión abierta — tenant-aware. */
export const suspendCashSessionForPosFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => cashSessionIdSchema.parse(data))
	.handler(async ({ data }) => {
		const { suspendCashSessionForPos } = await import(
			"./cash-session-access.server"
		);
		return await suspendCashSessionForPos(data);
	});

/** Sesión open del terminal — tenant-aware. */
export const getActiveCashSessionForPosFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => terminalSchema.parse(data ?? {}))
	.handler(async ({ data }) => {
		const { getActiveCashSessionForPos } = await import(
			"./cash-session-access.server"
		);
		return await getActiveCashSessionForPos(data);
	});
