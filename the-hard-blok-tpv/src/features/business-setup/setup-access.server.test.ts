import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getCurrentTenantContext: vi.fn(),
	updateBusinessForSetup: vi.fn(),
	markBusinessDetailsConfirmed: vi.fn(),
	logBusinessAuditEvent: vi.fn(),
	getBusinessSetupState: vi.fn(),
	getBusinessDetailsForSetup: vi.fn(),
}));

vi.mock("../auth/tenant-guards.server", () => ({
	getCurrentTenantContext: mocks.getCurrentTenantContext,
}));

vi.mock("../tenancy/queries.server", () => ({
	getBusinessDetailsForSetup: mocks.getBusinessDetailsForSetup,
	updateBusinessForSetup: mocks.updateBusinessForSetup,
}));

vi.mock("./audit.server", () => ({
	logBusinessAuditEvent: mocks.logBusinessAuditEvent,
}));

vi.mock("./setup-queries.server", () => ({
	markBusinessDetailsConfirmed: mocks.markBusinessDetailsConfirmed,
	markBusinessSetupCompleted: vi.fn(),
}));

vi.mock("./setup-state.server", () => ({
	getBusinessSetupState: mocks.getBusinessSetupState,
}));

import { confirmBusinessSetupDetails } from "./setup-access.server";

describe("confirmBusinessSetupDetails", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getCurrentTenantContext.mockResolvedValue({
			user: { id: "user-1" },
			role: "owner",
			business: {
				businessId: "biz-1",
				membershipId: "mem-1",
			},
		});
		mocks.getBusinessDetailsForSetup.mockResolvedValue({
			id: "biz-1",
			slug: "cafe-ada",
			name: "Café Ada",
			legal_name: "Ada SL",
			timezone: "Europe/Madrid",
			currency_code: "EUR",
		});
		mocks.getBusinessSetupState.mockResolvedValue({
			businessDetailsConfirmed: true,
			hasWarehouse: false,
			hasCategory: false,
			hasProduct: false,
			hasInitialStock: false,
			hasCashSession: false,
			hasOpenCashSession: false,
			canAccessSales: false,
			setupCompleted: false,
			currentStep: "warehouse",
			completedSteps: ["confirm_business"],
		});
	});

	it("updates business details, marks step 1 and returns next setup state", async () => {
		const result = await confirmBusinessSetupDetails({
			name: "Café Ada",
			legal_name: "Ada SL",
			timezone: "Europe/Madrid",
		});

		expect(mocks.updateBusinessForSetup).toHaveBeenCalled();
		expect(mocks.markBusinessDetailsConfirmed).toHaveBeenCalledWith("biz-1");
		expect(result.setup.currentStep).toBe("warehouse");
		expect(result.business.name).toBe("Café Ada");
	});
});
