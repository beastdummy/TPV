import { describe, expect, it } from "vitest";

import {
	canContinueFromSetupStep,
	getNextSetupStep,
	getPreviousSetupStep,
	getSetupContinueBlockedMessage,
	snapshotFromSetupState,
} from "./setup-navigation";

const emptySnapshot = snapshotFromSetupState({
	businessDetailsConfirmed: false,
	hasWarehouse: false,
	hasCategory: false,
	hasProduct: false,
	hasInitialStock: false,
	inventoryReviewed: false,
	cashConfigured: false,
	staffStepHandled: false,
	hasOpenCashSession: false,
});

const withCategory = snapshotFromSetupState({
	businessDetailsConfirmed: true,
	hasWarehouse: true,
	hasCategory: true,
	hasProduct: false,
	hasInitialStock: false,
	inventoryReviewed: false,
	cashConfigured: false,
	staffStepHandled: false,
	hasOpenCashSession: false,
});

const withProduct = snapshotFromSetupState({
	businessDetailsConfirmed: true,
	hasWarehouse: true,
	hasCategory: true,
	hasProduct: true,
	hasInitialStock: false,
	inventoryReviewed: false,
	cashConfigured: false,
	staffStepHandled: false,
	hasOpenCashSession: false,
});

const withStock = snapshotFromSetupState({
	businessDetailsConfirmed: true,
	hasWarehouse: true,
	hasCategory: true,
	hasProduct: true,
	hasInitialStock: true,
	inventoryReviewed: false,
	cashConfigured: false,
	staffStepHandled: false,
	hasOpenCashSession: false,
});

describe("setup navigation helpers", () => {
	it("getPreviousSetupStep walks back without implying data loss", () => {
		expect(getPreviousSetupStep("product")).toBe("category");
		expect(getPreviousSetupStep("initial_stock")).toBe("product");
		expect(getPreviousSetupStep("review_inventory")).toBe("initial_stock");
		expect(getPreviousSetupStep("confirm_business")).toBeNull();
	});

	it("getNextSetupStep advances in wizard order", () => {
		expect(getNextSetupStep("category")).toBe("product");
		expect(getNextSetupStep("product")).toBe("initial_stock");
		expect(getNextSetupStep("initial_stock")).toBe("review_inventory");
		expect(getNextSetupStep("configure_cash")).toBe("staff");
		expect(getNextSetupStep("staff")).toBe("open_cash");
	});

	it("blocks continue from category without at least one category", () => {
		expect(canContinueFromSetupStep("category", emptySnapshot)).toBe(false);
		expect(getSetupContinueBlockedMessage("category", emptySnapshot)).toMatch(
			/categoría/i,
		);
		expect(canContinueFromSetupStep("category", withCategory)).toBe(true);
	});

	it("blocks continue from product without at least one product", () => {
		expect(canContinueFromSetupStep("product", withCategory)).toBe(false);
		expect(getSetupContinueBlockedMessage("product", withCategory)).toMatch(
			/producto/i,
		);
		expect(canContinueFromSetupStep("product", withProduct)).toBe(true);
	});

	it("going back to a prior step does not clear setup snapshot flags", () => {
		expect(getPreviousSetupStep("review_inventory")).toBe("initial_stock");
		expect(withStock.hasCategory).toBe(true);
		expect(withStock.hasProduct).toBe(true);
		expect(withStock.hasInitialStock).toBe(true);
	});

	it("blocks continue from initial_stock without stock lines", () => {
		expect(canContinueFromSetupStep("initial_stock", withProduct)).toBe(false);
		expect(
			getSetupContinueBlockedMessage("initial_stock", withProduct),
		).toMatch(/entrada/i);
		expect(canContinueFromSetupStep("initial_stock", withStock)).toBe(true);
		expect(canContinueFromSetupStep("review_inventory", withStock)).toBe(false);
		expect(
			canContinueFromSetupStep("review_inventory", {
				...withStock,
				inventoryReviewed: true,
			}),
		).toBe(true);
	});

	it("staff step can always continue without extra employees", () => {
		expect(canContinueFromSetupStep("staff", emptySnapshot)).toBe(true);
	});
});
