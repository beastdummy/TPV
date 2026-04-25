import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { Pool } from "pg";

let authSingleton: ReturnType<typeof betterAuth> | undefined;

/**
 * Lazy Better Auth instance so missing env does not crash the whole dev server
 * on route tree load; failures surface when auth is actually used.
 */
export function getAuth(): ReturnType<typeof betterAuth> {
	if (authSingleton) {
		return authSingleton;
	}

	const databaseUrl = process.env.DATABASE_URL;

	if (!databaseUrl) {
		throw new Error(
			"DATABASE_URL is not set. Copy .env.example to .env in the TPV project root, set DATABASE_URL to your PostgreSQL connection string, then restart the dev server. See docs/variables-entorno-y-google.md",
		);
	}

	const betterAuthSecret = process.env.BETTER_AUTH_SECRET;

	if (!betterAuthSecret || betterAuthSecret.length < 32) {
		throw new Error(
			"BETTER_AUTH_SECRET must be set to a random string of at least 32 characters",
		);
	}

	const betterAuthUrl = process.env.BETTER_AUTH_URL;

	if (!betterAuthUrl) {
		throw new Error(
			"BETTER_AUTH_URL must be set to your public app URL (e.g. http://localhost:3000)",
		);
	}

	const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
	const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

	const googleEnabled = Boolean(googleClientId && googleClientSecret);

	authSingleton = betterAuth({
		baseURL: betterAuthUrl,
		secret: betterAuthSecret,
		database: new Pool({
			connectionString: databaseUrl,
		}),
		emailAndPassword: {
			enabled: false,
		},
		socialProviders: googleEnabled
			? {
					google: {
						clientId: googleClientId as string,
						clientSecret: googleClientSecret as string,
					},
				}
			: {},
		plugins: [tanstackStartCookies()],
	});

	return authSingleton;
}
