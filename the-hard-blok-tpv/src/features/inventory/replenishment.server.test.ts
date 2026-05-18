import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	query: vi.fn(),
}));

vi.mock("../../lib/db.server", () => ({
	db: { query: mocks.query },
}));

import { getReplenishmentListForAdmin } from "./replenishment.server";

describe("replenishment.server", () => {
	afterEach(() => {
		vi.resetAllMocks();
	});

	it("calculates shortage with negative stock (min 24, current -12 → 36)", async () => {
		mocks.query.mockResolvedValue({
			rows: [
				{
					product_id: "p1",
					product_name: "Cola",
					warehouse_id: "bar",
					warehouse_name: "Barra",
					current_quantity: -12,
					sold_today: 20,
					minimum_quantity: 24,
					reorder_quantity: 0,
				},
			],
		});

		const rows = await getReplenishmentListForAdmin("bar");
		expect(rows[0]?.shortage).toBe(36);
		expect(["Negativo", "Urgente"]).toContain(rows[0]?.status);
	});

	it("marks OK when current meets minimum", async () => {
		mocks.query.mockResolvedValue({
			rows: [
				{
					product_id: "p1",
					product_name: "Agua",
					warehouse_id: "bar",
					warehouse_name: "Barra",
					current_quantity: 30,
					sold_today: 2,
					minimum_quantity: 24,
					reorder_quantity: 12,
				},
			],
		});

		const rows = await getReplenishmentListForAdmin();
		expect(rows[0]?.status).toBe("OK");
		expect(rows[0]?.shortage).toBe(0);
	});
});
