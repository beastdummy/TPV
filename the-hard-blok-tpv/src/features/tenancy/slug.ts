export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeBusinessSlug(value: string): string {
	return value.trim().toLowerCase();
}

export function slugifyBusinessName(name: string): string {
	const slug = name
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 48);

	return slug.length > 0 ? slug : "negocio";
}
