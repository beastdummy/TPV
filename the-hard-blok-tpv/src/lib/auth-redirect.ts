import { isAllowedWebReturnTo } from "./web-app-url";

export type AuthEntrySearch = {
	redirect?: string;
	returnTo?: string;
};

const POST_LOGIN_PATH = "/auth/post-login";

export function getPostLoginPath(): string {
	return POST_LOGIN_PATH;
}

/** Ruta interna del TPV tras login (solo paths que empiezan por /). */
export function resolveInternalRedirect(redirect?: string): string {
	if (redirect?.startsWith("/") && !redirect.startsWith("//")) {
		return redirect;
	}
	return "/dashboard";
}

export function resolveReturnTo(search: AuthEntrySearch): string | undefined {
	if (search.returnTo && isAllowedWebReturnTo(search.returnTo)) {
		return appendWebSignedInMarker(search.returnTo);
	}
	return undefined;
}

/** La web no comparte cookies con el TPV en otro puerto; marca la vuelta tras OAuth. */
export function appendWebSignedInMarker(returnTo: string): string {
	const url = new URL(returnTo);
	url.searchParams.set("tpv", "signed-in");
	return url.toString();
}

const RETURN_TO_KEY = "tpv-return-to";
const INTERNAL_REDIRECT_KEY = "tpv-internal-redirect";

export function stashAuthRedirects(search: AuthEntrySearch) {
	if (typeof window === "undefined") {
		return;
	}

	const returnTo = resolveReturnTo(search);
	if (returnTo) {
		sessionStorage.setItem(RETURN_TO_KEY, returnTo);
	}

	const internal = search.redirect?.startsWith("/")
		? search.redirect
		: undefined;
	if (internal) {
		sessionStorage.setItem(INTERNAL_REDIRECT_KEY, internal);
	}
}

export function consumeStashedWebReturnTo(): string | undefined {
	if (typeof window === "undefined") {
		return undefined;
	}
	const stored = sessionStorage.getItem(RETURN_TO_KEY);
	sessionStorage.removeItem(RETURN_TO_KEY);
	if (stored && isAllowedWebReturnTo(stored)) {
		return appendWebSignedInMarker(stored);
	}
	return undefined;
}

export function consumeStashedInternalRedirect(): string | undefined {
	if (typeof window === "undefined") {
		return undefined;
	}
	const stored = sessionStorage.getItem(INTERNAL_REDIRECT_KEY);
	sessionStorage.removeItem(INTERNAL_REDIRECT_KEY);
	if (stored?.startsWith("/") && !stored.startsWith("//")) {
		return stored;
	}
	return undefined;
}
