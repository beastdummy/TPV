import { getDefaultBusinessConfig } from "./config.server";
import {
	getBusinessBySlug,
	getDefaultBusiness,
	getMembership,
	getPrimaryMembership,
} from "./queries.server";
import type { BusinessContext } from "./types";

/**
 * Resuelve el contexto de negocio para un usuario en instalaciones single-tenant
 * (negocio por DEFAULT_BUSINESS_SLUG). No sustituye aún route guards ni users.role.
 */
export async function resolveDefaultBusinessContext(
	userId: string,
): Promise<BusinessContext | null> {
	const { slug } = getDefaultBusinessConfig();

	let business = await getDefaultBusiness();

	if (!business) {
		business = await getBusinessBySlug(slug);
	}

	if (!business) {
		return null;
	}

	let membership = await getMembership(business.id, userId);

	if (!membership || membership.status !== "active") {
		const primary = await getPrimaryMembership(userId);
		if (!primary || primary.businessId !== business.id) {
			return null;
		}
		membership = primary;
	}

	return {
		userId,
		businessId: business.id,
		businessSlug: business.slug,
		businessName: business.name,
		membershipId: membership.id,
		role: membership.role,
	};
}
