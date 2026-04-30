import { oc } from "@orpc/contract"

import { adminDashboardContract } from "./admin-dashboard.contract.js"

export const v1AdminDashboard = oc
	.prefix("/admin-dashboard")
	.router(oc.router(adminDashboardContract))
