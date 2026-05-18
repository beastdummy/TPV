import { db } from "../../lib/db.server";
import { getPrimaryMembership } from "./queries.server";

/**
 * Marca la membresía indicada como primaria si el usuario no tiene otra primaria activa.
 */
export async function ensurePrimaryMembership(params: {
	userId: string;
	businessId: string;
	membershipId: string;
}): Promise<void> {
	const primary = await getPrimaryMembership(params.userId);

	if (primary) {
		if (primary.id === params.membershipId) {
			return;
		}
		if (primary.businessId !== params.businessId) {
			return;
		}
	}

	await db.query(
		`
    UPDATE business_members
    SET is_primary = TRUE, updated_at = NOW()
    WHERE id = $1
      AND user_id = $2
      AND business_id = $3
    `,
		[params.membershipId, params.userId, params.businessId],
	);
}
