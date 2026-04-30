import { oc } from "@orpc/contract"

import { systemSettingsContract } from "./system-settings.contract.js"

export const v1SystemSettings = oc
	.prefix("/system-settings")
	.router(oc.router(systemSettingsContract))
