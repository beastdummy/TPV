export const PLATFORM_ROLE_VALUES = [
	"platform_owner",
	"platform_admin",
	"platform_support",
] as const;

export type PlatformRole = (typeof PLATFORM_ROLE_VALUES)[number];

/** Roles con acceso al dashboard global /platform. */
export const PLATFORM_DASHBOARD_ROLES: PlatformRole[] = [
	"platform_owner",
	"platform_admin",
	"platform_support",
];

export const PLATFORM_PLAN_PLACEHOLDER = "starter" as const;

export type PlatformAdmin = {
	id: string;
	userId: string;
	role: PlatformRole;
	isActive: boolean;
};

export type PlatformDashboardSummary = {
	totalBusinesses: number;
	activeBusinesses: number;
	totalUsers: number;
	completedSales: number;
	totalSalesCents: number;
};

export type PlatformBusinessRow = {
	id: string;
	name: string;
	slug: string;
	status: string;
	createdAt: string;
	plan: typeof PLATFORM_PLAN_PLACEHOLDER;
	ownerEmail: string | null;
	memberCount: number;
	salesCount: number;
};

export type PlatformDashboardData = {
	summary: PlatformDashboardSummary;
	businesses: PlatformBusinessRow[];
};
