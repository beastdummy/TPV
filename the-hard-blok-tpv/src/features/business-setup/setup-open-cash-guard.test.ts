import { describe, expect, it } from "vitest";

import { resolveSetupCurrentStep } from "./setup-step-resolution";

describe("open cash prerequisites", () => {
	it("requires review_inventory before complete when stock exists but not reviewed", () => {
		const step = resolveSetupCurrentStep({
			businessDetailsConfirmed: true,
			hasWarehouse: true,
			hasCategory: true,
			hasProduct: true,
			hasInitialStock: true,
			inventoryReviewed: false,
			cashConfigured: true,
			staffStepHandled: true,
			hasOpenCashSession: false,
			setupCompleted: false,
		});

		expect(step).toBe("review_inventory");
	});
});
