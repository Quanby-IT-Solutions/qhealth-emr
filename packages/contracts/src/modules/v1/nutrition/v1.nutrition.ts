import { oc } from "@orpc/contract"

import { nutritionContract } from "./nutrition.contract.js"

export const v1Nutrition = oc.prefix("/nutrition").router(oc.router(nutritionContract))
