type RateLimitEntry = {
	failures: number;
	windowStartedAt: number;
	lockedUntil: number | null;
};

const MAX_FAILURES = 5;
const WINDOW_MS = 5 * 60 * 1000;
const LOCK_MS = 2 * 60 * 1000;

const store = new Map<string, RateLimitEntry>();

function rateLimitKey(businessId: string, terminalId: string) {
	return `${businessId}:${terminalId}`;
}

export function assertPosPinRateLimitAllowed(
	businessId: string,
	terminalId: string,
) {
	const key = rateLimitKey(businessId, terminalId);
	const now = Date.now();
	const entry = store.get(key);

	if (!entry) {
		return;
	}

	if (entry.lockedUntil && entry.lockedUntil > now) {
		throw new Error("POS_PIN_RATE_LIMITED");
	}

	if (now - entry.windowStartedAt > WINDOW_MS) {
		store.delete(key);
	}
}

export function recordPosPinFailure(businessId: string, terminalId: string) {
	const key = rateLimitKey(businessId, terminalId);
	const now = Date.now();
	const entry = store.get(key) ?? {
		failures: 0,
		windowStartedAt: now,
		lockedUntil: null,
	};

	if (now - entry.windowStartedAt > WINDOW_MS) {
		entry.failures = 0;
		entry.windowStartedAt = now;
		entry.lockedUntil = null;
	}

	entry.failures += 1;

	if (entry.failures >= MAX_FAILURES) {
		entry.lockedUntil = now + LOCK_MS;
	}

	store.set(key, entry);
}

export function clearPosPinRateLimit(businessId: string, terminalId: string) {
	store.delete(rateLimitKey(businessId, terminalId));
}

export function resetPosPinRateLimitStore() {
	store.clear();
}
