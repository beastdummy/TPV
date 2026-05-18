import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	query: vi.fn(),
}));

vi.mock("../../lib/db.server", () => ({
	db: { query: mocks.query },
}));

import {
	hasInitialStockRecorded,
	listProductStockLinesForSetup,
} from "./setup-queries.server";
import {
	buildSetupCompletedSteps,
	isSetupReadyForCompletion,
	resolveSetupCurrentStep,
} from "./setup-step-resolution";

describe("setup flow stock gates", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("hasInitialStockRecorded is true only when product_stock has quantity > 0", async () => {
		mocks.query.mockResolvedValueOnce({ rows: [{ exists: true }] });
		await expect(hasInitialStockRecorded()).resolves.toBe(true);

		mocks.query.mockResolvedValueOnce({ rows: [{ exists: false }] });
		await expect(hasInitialStockRecorded()).resolves.toBe(false);
	});

	it("listProductStockLinesForSetup reads product_stock", async () => {
		mocks.query.mockResolvedValueOnce({
			rows: [
				{
					product_id: "p1",
					product_name: "Cola",
					warehouse_id: "bar",
					warehouse_name: "Barra",
					quantity: 12,
				},
			],
		});

		const lines = await listProductStockLinesForSetup();
		expect(lines).toHaveLength(1);
		expect(lines[0]?.quantity).toBe(12);
	});

	it("resolveSetupCurrentStep stays on initial_stock until stock exists", () => {
		expect(
			resolveSetupCurrentStep({
				businessDetailsConfirmed: true,
				hasWarehouse: true,
				hasCategory: true,
				hasProduct: true,
				hasInitialStock: false,
				inventoryReviewed: false,
				cashConfigured: false,
				hasOpenCashSession: false,
				setupCompleted: false,
			}),
		).toBe("initial_stock");
	});

	it("full setup reaches complete at step 9 when all flags are set", () => {
		const flags = {
			businessDetailsConfirmed: true,
			hasWarehouse: true,
			hasCategory: true,
			hasProduct: true,
			hasInitialStock: true,
			inventoryReviewed: true,
			cashConfigured: true,
			staffStepHandled: true,
			hasOpenCashSession: true,
			setupCompleted: false,
		};

		expect(resolveSetupCurrentStep(flags)).toBe("complete");
		expect(isSetupReadyForCompletion(flags)).toBe(true);
		expect(buildSetupCompletedSteps(flags)).toEqual([
			"confirm_business",
			"warehouse",
			"category",
			"product",
			"initial_stock",
			"review_inventory",
			"configure_cash",
			"staff",
			"open_cash",
		]);
	});

	it("cannot complete setup without initial stock", () => {
		expect(
			isSetupReadyForCompletion({
				businessDetailsConfirmed: true,
				hasWarehouse: true,
				hasCategory: true,
				hasProduct: true,
				hasInitialStock: false,
				inventoryReviewed: true,
				cashConfigured: true,
				staffStepHandled: true,
				hasOpenCashSession: true,
				setupCompleted: false,
			}),
		).toBe(false);
	});
});
