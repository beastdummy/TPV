import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	query: vi.fn(),
}));

vi.mock("../../lib/db.server", () => ({
	db: { query: mocks.query },
}));

import {
	getBusinessOperationalWarehouseId,
	resolveOperationalWarehouseForBusiness,
} from "./operational-warehouse.server";

describe("operational warehouse", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("uses configured operational warehouse from business settings", async () => {
		mocks.query.mockImplementation(async (sql: string) => {
			if (sql.includes("settings->'setup'")) {
				return { rows: [{ warehouse_id: "barra" }] };
			}
			if (sql.includes("FROM warehouses") && sql.includes("WHERE id")) {
				return {
					rows: [
						{ id: "barra", name: "Barra", is_active: true, is_default: true },
					],
				};
			}
			return { rows: [] };
		});

		const warehouse = await resolveOperationalWarehouseForBusiness("biz-1");
		expect(warehouse.id).toBe("barra");
	});

	it("falls back to default warehouse when settings missing", async () => {
		mocks.query.mockImplementation(async (sql: string) => {
			if (sql.includes("settings->'setup'")) {
				return { rows: [{ warehouse_id: null }] };
			}
			if (sql.includes("is_default = TRUE")) {
				return {
					rows: [
						{ id: "barra", name: "Barra", is_active: true, is_default: true },
					],
				};
			}
			return { rows: [] };
		});

		const warehouse = await resolveOperationalWarehouseForBusiness("biz-1");
		expect(warehouse.id).toBe("barra");
	});

	it("reads operational warehouse id from settings", async () => {
		mocks.query.mockResolvedValue({
			rows: [{ warehouse_id: "barra" }],
		});

		await expect(getBusinessOperationalWarehouseId("biz-1")).resolves.toBe(
			"barra",
		);
	});
});
