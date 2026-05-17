import { z } from "zod";

import { ALL_BUSINESS_PERMISSION_KEYS } from "./permissions";

const emailSchema = z.string().trim().email().max(200);
const nameSchema = z.string().trim().min(1).max(120);
const roleSlugSchema = z.string().trim().min(1).max(80);
const pinSchema = z
	.string()
	.trim()
	.optional()
	.refine((value) => !value || /^\d{4,8}$/.test(value), {
		message: "El PIN debe tener entre 4 y 8 dígitos.",
	});

export const createEmployeeSchema = z.object({
	name: nameSchema,
	email: emailSchema,
	role_slug: roleSlugSchema,
	status: z.enum(["active", "suspended"]),
	pin: pinSchema,
});

export const updateEmployeeSchema = createEmployeeSchema.extend({
	membership_id: z.string().uuid(),
	clear_pin: z.boolean().optional(),
});

export const createRoleSchema = z.object({
	name: nameSchema,
	description: z.string().trim().max(500),
	slug: z
		.string()
		.trim()
		.min(1)
		.max(80)
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
		.optional(),
});

export const updateRoleSchema = z.object({
	role_id: z.string().uuid(),
	name: nameSchema,
	description: z.string().trim().max(500),
});

const permissionKeySchema = z
	.string()
	.refine(
		(value): value is (typeof ALL_BUSINESS_PERMISSION_KEYS)[number] =>
			(ALL_BUSINESS_PERMISSION_KEYS as readonly string[]).includes(value),
		{ message: "Permiso inválido." },
	);

export const saveRolePermissionsSchema = z.object({
	role_id: z.string().uuid(),
	permission_keys: z.array(permissionKeySchema).default([]),
});

export const idSchema = z.object({
	id: z.string().uuid(),
});

export function slugifyRoleName(value: string) {
	return value
		.toLowerCase()
		.trim()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}
