export type AssignableRoleOption = {
	id: string;
	slug: string;
	name: string;
};

export type AssignableRoleSource = {
	id: string;
	slug: string;
	name: string;
};

/** Roles definidos en business_roles (sin slugs legacy hardcodeados). */
export function buildAssignableRolesList(
	customRoles: AssignableRoleSource[],
): AssignableRoleOption[] {
	const seenSlugs = new Set<string>();
	const options: AssignableRoleOption[] = [];

	for (const role of customRoles) {
		if (seenSlugs.has(role.slug)) {
			continue;
		}
		seenSlugs.add(role.slug);
		options.push({
			id: role.id,
			slug: role.slug,
			name: role.name,
		});
	}

	return options;
}

export function hasUniqueAssignableRoleIds(
	roles: AssignableRoleOption[],
): boolean {
	const ids = new Set<string>();
	for (const role of roles) {
		if (ids.has(role.id)) {
			return false;
		}
		ids.add(role.id);
	}
	return true;
}
