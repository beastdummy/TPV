export type PostLoginRedirectPath =
	| "/login"
	| "/register"
	| "/platform"
	| "/setup"
	| "/dashboard";

export type PostLoginRedirectContext = {
	authenticated: boolean;
	hasBusinessMembership: boolean;
	isPlatformOnly: boolean;
	setupCompleted: boolean | null;
};

/**
 * Destino tras autenticación o al resolver acceso a rutas protegidas.
 * Prioridad: plataforma sin negocio → negocio con setup pendiente → dashboard.
 */
export function resolvePostLoginRedirect(
	ctx: PostLoginRedirectContext,
): PostLoginRedirectPath {
	if (!ctx.authenticated) {
		return "/login";
	}

	if (ctx.isPlatformOnly) {
		return "/platform";
	}

	if (!ctx.hasBusinessMembership) {
		return "/register";
	}

	if (ctx.setupCompleted === false) {
		return "/setup";
	}

	return "/dashboard";
}

export function shouldRedirectAuthenticatedFromAuthPage(
	ctx: PostLoginRedirectContext,
): boolean {
	if (!ctx.authenticated) {
		return false;
	}

	return resolvePostLoginRedirect(ctx) !== "/register";
}
