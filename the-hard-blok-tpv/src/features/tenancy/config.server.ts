const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type DefaultBusinessConfig = {
	slug: string;
	name: string;
};

export function getDefaultBusinessConfig(): DefaultBusinessConfig {
	const slug = (process.env.DEFAULT_BUSINESS_SLUG ?? "default").trim();
	const name = (process.env.DEFAULT_BUSINESS_NAME ?? "The Hard Blok").trim();

	if (!SLUG_PATTERN.test(slug)) {
		throw new Error(
			`DEFAULT_BUSINESS_SLUG inválido: "${slug}". Use solo a-z, 0-9 y guiones.`,
		);
	}
	if (!name) {
		throw new Error("DEFAULT_BUSINESS_NAME no puede estar vacío.");
	}

	return { slug, name };
}
