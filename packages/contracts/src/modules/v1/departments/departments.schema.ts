import { z } from "zod"

export const DepartmentSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	name: z.string(),
	code: z.string().nullable(),
	description: z.string().nullable(),
	isActive: z.boolean(),
	createdAt: z
		.union([z.date(), z.string()])
		.transform(v => (typeof v === "string" ? new Date(v) : v)),
	updatedAt: z
		.union([z.date(), z.string()])
		.transform(v => (typeof v === "string" ? new Date(v) : v)),
})

export type Department = z.infer<typeof DepartmentSchema>

export const UpsertDepartmentSchema = z.object({
	id: z.string().uuid().optional(),
	facilityId: z.string().uuid(),
	name: z.string().min(1, "Name is required").max(100),
	code: z.string().max(20).nullable().optional(),
	description: z.string().nullable().optional(),
	isActive: z.boolean().optional(),
})

export type UpsertDepartmentInput = z.infer<typeof UpsertDepartmentSchema>

export const DepartmentIdSchema = z.object({ id: z.string().uuid() })
export const FacilityIdSchema = z.object({ facilityId: z.string().uuid() })
