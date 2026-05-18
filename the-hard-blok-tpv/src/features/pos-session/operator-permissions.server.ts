import { hasPermissionForBusinessRole } from "../business-staff/permission-for-role.server";
import type { PosOperatorPermissions } from "./types";

export async function buildOperatorPermissions(
	businessId: string,
	roleSlug: string,
): Promise<PosOperatorPermissions> {
	const [salesView, salesManage] = await Promise.all([
		hasPermissionForBusinessRole(businessId, roleSlug, "sales.view"),
		hasPermissionForBusinessRole(businessId, roleSlug, "sales.manage"),
	]);

	return {
		"sales.view": salesView,
		"sales.manage": salesManage,
	};
}

export async function requireOperatorPermission(
	businessId: string,
	roleSlug: string,
	permission: keyof PosOperatorPermissions,
) {
	const permissions = await buildOperatorPermissions(businessId, roleSlug);
	if (!permissions[permission]) {
		throw new Error("FORBIDDEN");
	}
}
