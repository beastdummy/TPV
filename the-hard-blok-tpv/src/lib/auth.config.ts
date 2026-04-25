/**
 * Used by the Better Auth CLI: `npm run db:auth-migrate`
 * (`npx auth migrate` expects a file that exports `auth`).
 */
import { getAuth } from "./auth.server";

export const auth = getAuth();
