import { Injectable } from "@nestjs/common"

// TODO: BIL-BE-08 — implement Konsulta capitation service methods
// - listKonsultaActivities (by patient, period, type)
// - recordKonsultaEvent (idempotent on patientId+activityType+date unique index)
// - generateKonsultaReport (period; XML + CSV; member-level + aggregate counts)
@Injectable()
export class KonsultaService {}
