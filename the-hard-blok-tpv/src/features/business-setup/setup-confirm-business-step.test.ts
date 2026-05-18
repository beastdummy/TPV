import { describe, expect, it, vi } from "vitest";

import {
	type ConfirmBusinessFormValues,
	submitConfirmBusinessStep,
} from "./setup-confirm-business-step";
import { formatSetupRpcError } from "./setup-errors";

const values: ConfirmBusinessFormValues = {
	name: "Café Ada",
	legal_name: "Ada SL",
	timezone: "Europe/Madrid",
};

describe("setup step 1 — confirm business", () => {
	it("submit handler calls the confirm action with form values", async () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined);
		const event = { preventDefault: vi.fn() };

		await submitConfirmBusinessStep(event, values, onSubmit);

		expect(event.preventDefault).toHaveBeenCalled();
		expect(onSubmit).toHaveBeenCalledWith(values);
	});

	it("maps forbidden errors to a visible UI message", () => {
		expect(formatSetupRpcError(new Error("FORBIDDEN"))).toContain(
			"propietario",
		);
	});
});
