import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	countActiveWarehouses: vi.fn(),
	countActiveCategories: vi.fn(),
	countActiveProducts: vi.fn(),
	hasInitialStockRecorded: vi.fn(),
	countCashSessionsForBusiness: vi.fn(),
	hasOpenCashSessionForBusiness: vi.fn(),
	getBusinessSetupCompletedAt: vi.fn(),
}));

vi.mock("./setup-queries.server", () => ({
	countActiveWarehouses: mocks.countActiveWarehouses,
	countActiveCategories: mocks.countActiveCategories,
	countActiveProducts: mocks.countActiveProducts,
	hasInitialStockRecorded: mocks.hasInitialStockRecorded,
	countCashSessionsForBusiness: mocks.countCashSessionsForBusiness,
	hasOpenCashSessionForBusiness: mocks.hasOpenCashSessionForBusiness,
	getBusinessSetupCompletedAt: mocks.getBusinessSetupCompletedAt,
}));

import { getBusinessSetupState } from "./setup-state.server";

describe("getBusinessSetupState", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.countActiveWarehouses.mockResolvedValue(0);
		mocks.countActiveCategories.mockResolvedValue(0);
		mocks.countActiveProducts.mockResolvedValue(0);
		mocks.hasInitialStockRecorded.mockResolvedValue(false);
		mocks.countCashSessionsForBusiness.mockResolvedValue(0);
		mocks.hasOpenCashSessionForBusiness.mockResolvedValue(false);
		mocks.getBusinessSetupCompletedAt.mockResolvedValue(null);
	});

	it("detects zero completed steps for a new business", async () => {
		const state = await getBusinessSetupState("biz-1");
		expect(state.hasWarehouse).toBe(false);
		expect(state.setupCompleted).toBe(false);
		expect(state.currentStep).toBe("confirm_business");
		expect(state.completedSteps).toEqual([]);
	});

	it("advances current step when warehouse exists", async () => {
		mocks.countActiveWarehouses.mockResolvedValue(1);
		const state = await getBusinessSetupState("biz-1");
		expect(state.hasWarehouse).toBe(true);
		expect(state.currentStep).toBe("warehouse");
	});

	it("unlocks sales access when cash is open", async () => {
		mocks.countActiveWarehouses.mockResolvedValue(1);
		mocks.countActiveCategories.mockResolvedValue(1);
		mocks.countActiveProducts.mockResolvedValue(1);
		mocks.hasInitialStockRecorded.mockResolvedValue(true);
		mocks.hasOpenCashSessionForBusiness.mockResolvedValue(true);
		const state = await getBusinessSetupState("biz-1");
		expect(state.canAccessSales).toBe(true);
		expect(state.currentStep).toBe("complete");
	});
});
