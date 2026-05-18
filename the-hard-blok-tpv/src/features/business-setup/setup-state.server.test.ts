import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	isBusinessDetailsConfirmed: vi.fn(),
	countActiveWarehouses: vi.fn(),
	countActiveCategories: vi.fn(),
	countActiveProducts: vi.fn(),
	hasInitialStockRecorded: vi.fn(),
	isInventoryReviewedForBusiness: vi.fn(),
	isCashConfiguredForBusiness: vi.fn(),
	isStaffStepHandledForBusiness: vi.fn(),
	hasOpenCashSessionForBusiness: vi.fn(),
	getBusinessSetupCompletedAt: vi.fn(),
}));

vi.mock("./setup-queries.server", () => ({
	isBusinessDetailsConfirmed: mocks.isBusinessDetailsConfirmed,
	countActiveWarehouses: mocks.countActiveWarehouses,
	countActiveCategories: mocks.countActiveCategories,
	countActiveProducts: mocks.countActiveProducts,
	hasInitialStockRecorded: mocks.hasInitialStockRecorded,
	isInventoryReviewedForBusiness: mocks.isInventoryReviewedForBusiness,
	isCashConfiguredForBusiness: mocks.isCashConfiguredForBusiness,
	isStaffStepHandledForBusiness: mocks.isStaffStepHandledForBusiness,
	hasOpenCashSessionForBusiness: mocks.hasOpenCashSessionForBusiness,
	getBusinessSetupCompletedAt: mocks.getBusinessSetupCompletedAt,
}));

import { getBusinessSetupState } from "./setup-state.server";

describe("getBusinessSetupState", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.isBusinessDetailsConfirmed.mockResolvedValue(false);
		mocks.countActiveWarehouses.mockResolvedValue(0);
		mocks.countActiveCategories.mockResolvedValue(0);
		mocks.countActiveProducts.mockResolvedValue(0);
		mocks.hasInitialStockRecorded.mockResolvedValue(false);
		mocks.isInventoryReviewedForBusiness.mockResolvedValue(false);
		mocks.isCashConfiguredForBusiness.mockResolvedValue(false);
		mocks.isStaffStepHandledForBusiness.mockResolvedValue(false);
		mocks.hasOpenCashSessionForBusiness.mockResolvedValue(false);
		mocks.getBusinessSetupCompletedAt.mockResolvedValue(null);
	});

	it("starts on confirm_business for a new business", async () => {
		const state = await getBusinessSetupState("biz-1");
		expect(state.currentStep).toBe("confirm_business");
	});

	it("requires configure_cash before staff and open_cash", async () => {
		mocks.isBusinessDetailsConfirmed.mockResolvedValue(true);
		mocks.countActiveWarehouses.mockResolvedValue(1);
		mocks.countActiveCategories.mockResolvedValue(1);
		mocks.countActiveProducts.mockResolvedValue(1);
		mocks.hasInitialStockRecorded.mockResolvedValue(true);
		mocks.isInventoryReviewedForBusiness.mockResolvedValue(true);
		mocks.isCashConfiguredForBusiness.mockResolvedValue(false);

		const state = await getBusinessSetupState("biz-1");
		expect(state.currentStep).toBe("configure_cash");

		mocks.isCashConfiguredForBusiness.mockResolvedValue(true);
		mocks.isStaffStepHandledForBusiness.mockResolvedValue(false);
		const staffPending = await getBusinessSetupState("biz-1");
		expect(staffPending.currentStep).toBe("staff");
	});
});
