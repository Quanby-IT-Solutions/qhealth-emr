import { oc } from "@orpc/contract"

import { notificationContract } from "./notifications.contract.js"

export const v1Notification = oc.prefix("/notification").router(oc.router(notificationContract))
