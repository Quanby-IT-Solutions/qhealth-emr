import { oc } from "@orpc/contract"

import { ordersContract } from "./orders.contract.js"

export const v1Orders = oc.prefix("/orders").router(oc.router(ordersContract))
