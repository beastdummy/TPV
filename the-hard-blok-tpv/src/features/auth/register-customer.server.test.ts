import { APIError } from "better-auth/api";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	query: vi.fn(),
	signUpEmail: vi.fn(),
	getBusinessBySlug: vi.fn(),
	getRequestHeaders: vi.fn(),
}));

vi.mock("../../lib/db.server", () => ({
	db: { query: mocks.query },
}));

vi.mock("../../lib/auth.server", () => ({
	getAuth: () => ({
		api: {
			signUpEmail: mocks.signUpEmail,
		},
	}),
}));

vi.mock("@tanstack/react-start/server", () => ({
	getRequestHeaders: mocks.getRequestHeaders,
}));

vi.mock("../tenancy/queries.server", () => ({
	getBusinessBySlug: mocks.getBusinessBySlug,
}));

vi.mock("../business-setup/audit.server", () => ({
	logBusinessAuditEvent: vi.fn(),
}));

import { RegisterCustomerError } from "./register.errors";
import {
	parseRegisterCustomerOwnerInput,
	registerCustomerOwnerSchema,
} from "./register-customer.schema";
import {
	registerCustomerOwner,
	resolveBusinessSlugForRegistration,
} from "./register-customer.server";

const validInput = {
	userName: "Ada Owner",
	email: "ada@example.com",
	password: "password123",
	businessName: "Café Ada",
	businessSlug: "cafe-ada",
	posPin: "1234",
};

describe("register customer", () => {
	afterEach(() => {
		vi.resetAllMocks();
	});

	it("blocks weak passwords in schema validation", () => {
		const parsed = registerCustomerOwnerSchema.safeParse({
			...validInput,
			password: "short",
		});

		expect(parsed.success).toBe(false);
		expect(() =>
			parseRegisterCustomerOwnerInput({ ...validInput, password: "short" }),
		).toThrow(RegisterCustomerError);
	});

	it("blocks duplicate email before sign-up", async () => {
		mocks.getBusinessBySlug.mockResolvedValue(null);
		mocks.query.mockResolvedValueOnce({ rows: [{ exists: 1 }] });

		await expect(registerCustomerOwner(validInput)).rejects.toMatchObject({
			code: "EMAIL_ALREADY_EXISTS",
		});
		expect(mocks.signUpEmail).not.toHaveBeenCalled();
	});

	it("blocks duplicate explicit business slug", async () => {
		mocks.query.mockResolvedValueOnce({ rows: [] });
		mocks.getBusinessBySlug.mockResolvedValue({
			id: "biz-1",
			slug: "cafe-ada",
			name: "Existing",
			status: "active",
			timezone: "Europe/Madrid",
			currencyCode: "EUR",
		});

		await expect(registerCustomerOwner(validInput)).rejects.toMatchObject({
			code: "BUSINESS_SLUG_ALREADY_EXISTS",
		});
		expect(mocks.signUpEmail).not.toHaveBeenCalled();
	});

	it("creates user, business and owner membership on success", async () => {
		mocks.getRequestHeaders.mockReturnValue(new Headers());
		mocks.query.mockImplementation(async (sql: string) => {
			if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
				return { rows: [] };
			}
			if (sql.includes("FROM users") && sql.includes("email")) {
				return { rows: [] };
			}
			if (sql.includes("INSERT INTO users")) {
				return { rows: [{ id: "user-1" }] };
			}
			if (sql.includes("INSERT INTO businesses")) {
				return {
					rows: [{ id: "biz-1", slug: "cafe-ada", name: "Café Ada" }],
				};
			}
			if (sql.includes("FROM business_members") && sql.includes("owner")) {
				return { rows: [] };
			}
			if (sql.includes("INSERT INTO business_members")) {
				return { rows: [{ id: "member-1" }] };
			}
			return { rows: [] };
		});
		mocks.getBusinessBySlug.mockResolvedValue(null);
		mocks.signUpEmail.mockResolvedValue({
			user: { id: "ba-1", email: validInput.email, name: validInput.userName },
		});

		const result = await registerCustomerOwner(validInput);

		expect(mocks.signUpEmail).toHaveBeenCalled();
		expect(mocks.query).toHaveBeenCalledWith("BEGIN");
		expect(mocks.query).toHaveBeenCalledWith("COMMIT");
		expect(
			mocks.query.mock.calls.some(
				([sql]) =>
					typeof sql === "string" &&
					sql.includes("INSERT INTO business_members") &&
					sql.includes("'owner'"),
			),
		).toBe(true);
		expect(result.user.role).toBe("owner");
		expect(result.business.slug).toBe("cafe-ada");
		expect(
			mocks.query.mock.calls.some(
				([sql]) =>
					typeof sql === "string" &&
					sql.includes("INSERT INTO business_members") &&
					sql.includes("pos_pin_hash"),
			),
		).toBe(true);
		expect(result.redirectTo).toBe("/setup");
	});

	it("does not create a second owner when business already has one", async () => {
		mocks.getRequestHeaders.mockReturnValue(new Headers());
		mocks.query.mockImplementation(async (sql: string) => {
			if (sql === "BEGIN" || sql === "ROLLBACK") {
				return { rows: [] };
			}
			if (sql.includes("FROM users") && sql.includes("email")) {
				return { rows: [] };
			}
			if (sql.includes("INSERT INTO users")) {
				return { rows: [{ id: "user-1" }] };
			}
			if (sql.includes("INSERT INTO businesses")) {
				return {
					rows: [{ id: "biz-1", slug: "cafe-ada", name: "Café Ada" }],
				};
			}
			if (sql.includes("FROM business_members") && sql.includes("owner")) {
				return { rows: [{ exists: 1 }] };
			}
			return { rows: [] };
		});
		mocks.getBusinessBySlug.mockResolvedValue(null);
		mocks.signUpEmail.mockResolvedValue({
			user: { id: "ba-1", email: validInput.email, name: validInput.userName },
		});

		await expect(registerCustomerOwner(validInput)).rejects.toMatchObject({
			code: "BUSINESS_SLUG_ALREADY_EXISTS",
		});
		expect(mocks.query).toHaveBeenCalledWith("ROLLBACK");
	});

	it("maps Better Auth duplicate email to EMAIL_ALREADY_EXISTS", async () => {
		mocks.query.mockResolvedValueOnce({ rows: [] });
		mocks.getBusinessBySlug.mockResolvedValue(null);
		mocks.signUpEmail.mockRejectedValue(
			new APIError("UNPROCESSABLE_ENTITY", {
				code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
				message: "exists",
			}),
		);

		await expect(registerCustomerOwner(validInput)).rejects.toMatchObject({
			code: "EMAIL_ALREADY_EXISTS",
		});
	});

	it("autogenerates unique slug when omitted", async () => {
		mocks.getBusinessBySlug
			.mockResolvedValueOnce({
				id: "biz-existing",
				slug: "cafe-ada",
				name: "Taken",
				status: "active",
				timezone: "Europe/Madrid",
				currencyCode: "EUR",
			})
			.mockResolvedValueOnce(null);

		const slug = await resolveBusinessSlugForRegistration({
			businessName: "Café Ada",
		});

		expect(slug).toBe("cafe-ada-2");
	});

	it("repeated registration attempt keeps blocking duplicate email", async () => {
		mocks.query.mockImplementation(async (sql: string) => {
			if (sql.includes("FROM users") && sql.includes("email")) {
				return { rows: [{ exists: 1 }] };
			}
			return { rows: [] };
		});
		mocks.getBusinessBySlug.mockResolvedValue(null);

		await expect(registerCustomerOwner(validInput)).rejects.toMatchObject({
			code: "EMAIL_ALREADY_EXISTS",
		});
		await expect(registerCustomerOwner(validInput)).rejects.toMatchObject({
			code: "EMAIL_ALREADY_EXISTS",
		});
		expect(mocks.signUpEmail).not.toHaveBeenCalled();
	});
});
