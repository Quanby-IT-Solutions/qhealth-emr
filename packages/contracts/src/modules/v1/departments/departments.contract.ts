import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	DepartmentIdSchema,
	DepartmentSchema,
	FacilityIdSchema,
	UpsertDepartmentSchema,
} from "./departments.schema.js"

export const departmentsContract = {
	list: oc
		.route({ method: "GET", path: "/departments", summary: "List departments by facility", tags: ["Departments"] })
		.input(FacilityIdSchema)
		.output(z.array(DepartmentSchema)),

	get: oc
		.route({ method: "GET", path: "/departments/{id}", summary: "Get department by ID", tags: ["Departments"] })
		.input(DepartmentIdSchema)
		.output(DepartmentSchema),

	upsert: oc
		.route({ method: "PUT", path: "/departments", summary: "Create or update department", tags: ["Departments"] })
		.input(UpsertDepartmentSchema)
		.output(DepartmentSchema),

	delete: oc
		.route({ method: "DELETE", path: "/departments/{id}", summary: "Delete department", tags: ["Departments"] })
		.input(DepartmentIdSchema)
		.output(z.object({ success: z.boolean() })),
}
