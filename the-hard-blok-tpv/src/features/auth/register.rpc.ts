import { createServerFn } from "@tanstack/react-start";

import { parseRegisterCustomerOwnerInput } from "./register-customer.schema";
export const registerCustomerOwnerFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => parseRegisterCustomerOwnerInput(data))
	.handler(async ({ data }) => {
		const { registerCustomerOwner } = await import(
			"./register-customer.server"
		);
		return await registerCustomerOwner(data);
	});
