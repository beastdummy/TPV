import { verifyPassword } from "../auth/password.server";
import { getBusinessMemberPinHash } from "./queries.server";

/**
 * Verifica el PIN TPV de un miembro del negocio (por membership id o email).
 */
export async function verifyBusinessMemberPin(
	businessId: string,
	memberIdOrEmail: string,
	pin: string,
): Promise<boolean> {
	const trimmedPin = pin.trim();
	if (!/^\d{4,8}$/.test(trimmedPin)) {
		return false;
	}

	const storedHash = await getBusinessMemberPinHash({
		businessId,
		memberIdOrEmail: memberIdOrEmail.trim(),
	});

	if (!storedHash) {
		return false;
	}

	return verifyPassword(trimmedPin, storedHash);
}
