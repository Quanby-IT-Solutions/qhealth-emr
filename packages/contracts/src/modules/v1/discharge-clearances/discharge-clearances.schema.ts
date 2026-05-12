import { z } from "zod"

export const ClearanceTypeEnum = z.enum(["pharmacy", "nurse", "billing"])

const dateOrString = z.union([z.date(), z.string()]).transform(v => (typeof v === "string" ? new Date(v) : v))

export const ClearanceItemSchema = z.object({
    id: z.string().uuid(),
    encounterId: z.string().uuid(),
    type: ClearanceTypeEnum,
    clearedBy: z.string().uuid().nullable(),
    clearedAt: dateOrString.nullable(),
    notes: z.string().nullable(),
    createdAt: dateOrString,
    updatedAt: dateOrString,
})

export const ClearancesResponseSchema = z.object({
    pharmacy: ClearanceItemSchema.nullable(),
    nurse: ClearanceItemSchema.nullable(),
    billing: ClearanceItemSchema.nullable(),
})

export const RecordClearanceSchema = z.object({
    encounterId: z.string().uuid(),
    notes: z.string().max(2000).optional(),
})

export type ClearanceItem = z.infer<typeof ClearanceItemSchema>
