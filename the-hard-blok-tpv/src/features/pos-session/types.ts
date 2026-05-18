export const POS_OPERATOR_SESSION_STATUSES = [
	"active",
	"locked",
	"expired",
] as const;

export type PosOperatorSessionStatus =
	(typeof POS_OPERATOR_SESSION_STATUSES)[number];

export type PosOperatorPermissions = {
	"sales.view": boolean;
	"sales.manage": boolean;
};

export type ActivePosOperator = {
	session_id: string;
	token: string;
	terminal_id: string;
	business_id: string;
	operator_member_id: string;
	operator_user_id: string;
	operator_name: string;
	role: string;
	permissions: PosOperatorPermissions;
	started_at: string;
};

export type PosOperatorSessionRow = {
	id: string;
	business_id: string;
	terminal_id: string;
	operator_member_id: string;
	operator_user_id: string;
	operator_name: string;
	operator_role: string;
	status: PosOperatorSessionStatus;
	started_at: string;
	last_seen_at: string;
	locked_at: string | null;
};
