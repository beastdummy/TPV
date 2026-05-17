export type BusinessStaffMemberStatus =
	| "active"
	| "suspended"
	| "invited"
	| "removed";

export type BusinessEmployeeRow = {
	membership_id: string;
	user_id: string;
	name: string;
	email: string;
	role_slug: string;
	role_name: string;
	status: BusinessStaffMemberStatus;
	has_pin: boolean;
	is_primary: boolean;
};

export type BusinessRoleRow = {
	id: string;
	business_id: string;
	slug: string;
	name: string;
	description: string;
	is_system: boolean;
	member_count: number;
};

export type BusinessRolePermissionRow = {
	permission_key: string;
};
