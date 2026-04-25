import { redirect } from "@tanstack/react-router";

import { getAppUserFn } from "./auth.rpc";
import type { Role } from "./types";

export async function requireAuthForRoute(redirectTo: string) {
	const user = await getAppUserFn();

	if (!user) {
		throw redirect({
			to: "/login",
			search: { redirect: redirectTo },
		});
	}

	return user;
}

export async function requireRoleForRoute(roles: Role[], redirectTo: string) {
	const user = await requireAuthForRoute(redirectTo);

	if (!roles.includes(user.role)) {
		throw redirect({ to: "/dashboard" });
	}

	return user;
}
