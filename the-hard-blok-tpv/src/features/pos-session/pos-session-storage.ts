const STORAGE_PREFIX = "thb_pos_operator_token";

export function getPosOperatorStorageKey(terminalId: string) {
	return `${STORAGE_PREFIX}:${terminalId}`;
}

export function readStoredPosOperatorToken(terminalId: string): string | null {
	if (typeof window === "undefined") {
		return null;
	}

	return sessionStorage.getItem(getPosOperatorStorageKey(terminalId));
}

export function writeStoredPosOperatorToken(terminalId: string, token: string) {
	sessionStorage.setItem(getPosOperatorStorageKey(terminalId), token);
}

export function clearStoredPosOperatorToken(terminalId: string) {
	sessionStorage.removeItem(getPosOperatorStorageKey(terminalId));
}
