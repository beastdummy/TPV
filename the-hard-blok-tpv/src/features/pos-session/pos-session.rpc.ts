import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const terminalSchema = z.object({
	terminal_id: z.string().trim().min(1).max(80).optional(),
});

const pinSchema = terminalSchema.extend({
	pin: z
		.string()
		.trim()
		.regex(/^\d{4,8}$/),
	email: z.string().trim().email().optional(),
});

const tokenSchema = terminalSchema.extend({
	operator_token: z.string().trim().min(1),
});

/** Verifica PIN y abre sesión de operador en el terminal. */
export const verifyPosPinForTerminalFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => pinSchema.parse(data))
	.handler(async ({ data }) => {
		const { verifyPosPinForTerminalAccess } = await import(
			"./pos-session-access.server"
		);
		return await verifyPosPinForTerminalAccess({
			pin: data.pin,
			terminal_id: data.terminal_id ?? "default",
			email: data.email,
		});
	});

/** Operador activo según token (sesión en BD + firma). */
export const getActivePosOperatorFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => tokenSchema.parse(data))
	.handler(async ({ data }) => {
		const { getActivePosOperatorAccess } = await import(
			"./pos-session-access.server"
		);
		return await getActivePosOperatorAccess({
			operator_token: data.operator_token,
			terminal_id: data.terminal_id,
		});
	});

/** Bloquea terminal (vuelve a pantalla PIN; no cierra caja). */
export const lockPosTerminalFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) =>
		terminalSchema
			.extend({
				operator_token: z.string().trim().min(1).optional(),
			})
			.parse(data ?? {}),
	)
	.handler(async ({ data }) => {
		const { lockPosTerminalAccess } = await import(
			"./pos-session-access.server"
		);
		return await lockPosTerminalAccess({
			terminal_id: data.terminal_id ?? "default",
			operator_token: data.operator_token,
		});
	});

/** Cambia de empleado: bloquea sesión actual y pide nuevo PIN. */
export const switchPosOperatorFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) =>
		pinSchema
			.extend({
				operator_token: z.string().trim().min(1).optional(),
			})
			.parse(data),
	)
	.handler(async ({ data }) => {
		const { switchPosOperatorAccess } = await import(
			"./pos-session-access.server"
		);
		return await switchPosOperatorAccess({
			pin: data.pin,
			terminal_id: data.terminal_id ?? "default",
			email: data.email,
			operator_token: data.operator_token,
		});
	});
