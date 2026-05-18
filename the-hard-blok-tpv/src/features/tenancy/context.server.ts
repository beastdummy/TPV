import { getPrimaryMembership } from "./queries.server";
import type { BusinessContext } from "./types";

/**
 * Contexto del negocio primario activo del usuario (membresía is_primary).
 * Sin fallback a negocio "default": el primer tenant se crea vía /register.
 */
export async function resolveDefaultBusinessContext(
	userId: string,
): Promise<BusinessContext | null> {
	const primary = await getPrimaryMembership(userId);

	if (!primary) {
		return null;
	}

	return {
		userId,
		businessId: primary.businessId,
		businessSlug: primary.business.slug,
		businessName: primary.business.name,
		membershipId: primary.id,
		role: primary.role,
	};
}
