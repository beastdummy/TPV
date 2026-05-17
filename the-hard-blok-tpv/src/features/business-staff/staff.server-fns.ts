import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
	createEmployeeForBusiness,
	listAssignableRolesForBusiness,
	loadEmployeesForBusiness,
	updateEmployeeForBusiness,
} from "./employees-access.server";
import {
	createRoleForBusiness,
	deleteRoleForBusiness,
	loadRolePermissionsForBusiness,
	loadRolesForBusiness,
	saveRolePermissionsForBusiness,
	updateRoleForBusiness,
} from "./roles-access.server";
import {
	createEmployeeSchema,
	createRoleSchema,
	idSchema,
	saveRolePermissionsSchema,
	updateEmployeeSchema,
	updateRoleSchema,
} from "./schemas";

export const getEmployeesForAdminFn = createServerFn({ method: "GET" }).handler(
	async () => {
		return await loadEmployeesForBusiness();
	},
);

export const getAssignableRolesForAdminFn = createServerFn({
	method: "GET",
}).handler(async () => {
	return await listAssignableRolesForBusiness();
});

export const createEmployeeForAdminFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => createEmployeeSchema.parse(data))
	.handler(async ({ data }) => {
		return await createEmployeeForBusiness(data);
	});

export const updateEmployeeForAdminFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => updateEmployeeSchema.parse(data))
	.handler(async ({ data }) => {
		return await updateEmployeeForBusiness(data);
	});

export const getRolesForAdminFn = createServerFn({ method: "GET" }).handler(
	async () => {
		return await loadRolesForBusiness();
	},
);

export const getRolePermissionsForAdminFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => idSchema.parse(data))
	.handler(async ({ data }) => {
		return await loadRolePermissionsForBusiness(data.id);
	});

export const createRoleForAdminFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => createRoleSchema.parse(data))
	.handler(async ({ data }) => {
		return await createRoleForBusiness(data);
	});

export const updateRoleForAdminFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => updateRoleSchema.parse(data))
	.handler(async ({ data }) => {
		return await updateRoleForBusiness(data);
	});

export const saveRolePermissionsForAdminFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => saveRolePermissionsSchema.parse(data))
	.handler(async ({ data }) => {
		return await saveRolePermissionsForBusiness(data);
	});

export const deleteRoleForAdminFn = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => idSchema.parse(data))
	.handler(async ({ data }) => {
		return await deleteRoleForBusiness(data.id);
	});

export const checkBusinessPermissionFn = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) =>
		z.object({ permission: z.string().min(1) }).parse(data),
	)
	.handler(async ({ data }) => {
		const { hasBusinessPermission } = await import(
			"./business-permissions.server"
		);
		return { allowed: await hasBusinessPermission(data.permission) };
	});
