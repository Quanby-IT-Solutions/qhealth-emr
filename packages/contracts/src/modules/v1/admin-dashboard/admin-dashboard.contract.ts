import { oc } from "@orpc/contract"

import { AdminDashboardSummarySchema } from "./admin-dashboard.schema.js"

export const adminDashboardContract = {
	summary: oc
		.route({
			method: "GET",
			path: "/summary",
			summary: "Get administrator dashboard summary with governance KPIs",
			tags: ["Admin Dashboard"],
		})
		.output(AdminDashboardSummarySchema),
}
