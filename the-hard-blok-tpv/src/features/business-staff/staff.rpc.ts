import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const permissionSchema = z.object({
	permission: z.string().min(1),
});

/** Valida permiso de negocio (client-safe RPC). */
export const ensureBusinessPermissionFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => permissionSchema.parse(data))
	.handler(async ({ data }) => {
		const { requireBusinessPermission } = await import(
			"./business-permissions.server"
		);
		const { BusinessStaffError } = await import("./errors");

		try {
			return await requireBusinessPermission(data.permission);
		} catch (error) {
			if (error instanceof BusinessStaffError) {
				throw new Error(error.code);
			}
			throw error;
		}
	});
