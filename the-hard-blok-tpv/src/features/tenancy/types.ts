import type { Role } from "../auth/types";

export const BUSINESS_STATUS_VALUES = [
	"active",
	"suspended",
	"archived",
] as const;

export type BusinessStatus = (typeof BUSINESS_STATUS_VALUES)[number];

export const MEMBERSHIP_STATUS_VALUES = [
	"active",
	"invited",
	"suspended",
	"removed",
] as const;

export type MembershipStatus = (typeof MEMBERSHIP_STATUS_VALUES)[number];

export type Business = {
	id: string;
	slug: string;
	name: string;
	status: BusinessStatus;
	timezone: string;
	currencyCode: string;
};

export type BusinessMember = {
	id: string;
	businessId: string;
	userId: string;
	role: Role;
	status: MembershipStatus;
	isPrimary: boolean;
};

export type BusinessContext = {
	userId: string;
	businessId: string;
	businessSlug: string;
	businessName: string;
	membershipId: string;
	role: Role;
};
