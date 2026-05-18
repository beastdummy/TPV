export const POS_AUDIT_EVENTS = {
	OPERATOR_UNLOCK: "pos.operator.unlock",
	OPERATOR_LOCK: "pos.operator.lock",
	OPERATOR_SWITCH: "pos.operator.switch",
	SALE_FINALIZE: "pos.sale.finalize",
} as const;

export type PosAuditEventType =
	(typeof POS_AUDIT_EVENTS)[keyof typeof POS_AUDIT_EVENTS];

export type PosAuditEventPayload = {
	business_id: string;
	terminal_id: string;
	operator_member_id?: string;
	operator_user_id?: string;
	operator_name?: string;
	sale_id?: string;
};

/** Hook mínimo para auditoría futura (consola en dev). */
export function recordPosAuditEvent(
	event: PosAuditEventType,
	payload: PosAuditEventPayload,
) {
	if (process.env.NODE_ENV === "production") {
		return;
	}

	console.info(`[pos-audit] ${event}`, payload);
}
