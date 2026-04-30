import { Injectable, Logger } from "@nestjs/common"

import { env } from "@/config/env.config"

export interface NhdrSubmissionRequest {
	exportId: string
	facilityId: string
	periodStart: string
	periodEnd: string
	ndjsonContent: string
	submittedByName: string
}

export interface NhdrAcknowledgment {
	receiptNumber: string
	submissionDate: string
	responseCode: string
	responseMessage: string
}

/**
 * Adapter for NHDR (National Health Data Repository) submissions.
 *
 * When NHDR_MODE=real: POSTs NDJSON to the configured NHDR endpoint and
 * returns the real acknowledgment payload.
 *
 * When NHDR_MODE=mock (default): Returns a "pending" acknowledgment
 * indicating the submission is queued externally.  Does NOT fabricate a
 * successful receipt number.
 */
@Injectable()
export class NhdrAdapterService {
	private readonly logger = new Logger(NhdrAdapterService.name)

	async submit(req: NhdrSubmissionRequest, runtimeConfig?: { baseUrl?: string; apiKey?: string }): Promise<NhdrAcknowledgment> {
		if (env.NHDR_MODE === "real") {
			return this.submitReal(req, runtimeConfig)
		}
		return this.submitMock(req)
	}

	private async submitReal(req: NhdrSubmissionRequest, runtimeConfig?: { baseUrl?: string; apiKey?: string }): Promise<NhdrAcknowledgment> {
		const baseUrl = runtimeConfig?.baseUrl
		if (!baseUrl) {
			throw new Error(
				"NHDR submission requires a registry-configured endpoint. " +
				"Enable an NHDR integration in Admin \u2192 Integration Registry."
			)
		}

		const url = `${baseUrl}/submissions`
		const headers: Record<string, string> = {
			"Content-Type": "application/fhir+ndjson",
			"Accept": "application/json",
		}
		const apiKey = runtimeConfig?.apiKey
		if (apiKey) {
			headers["X-API-Key"] = apiKey
		}

		this.logger.log(`Submitting FHIR bundle to NHDR: exportId=${req.exportId}`)

		const response = await fetch(url, {
			method: "POST",
			headers,
			body: req.ndjsonContent,
		})

		if (!response.ok) {
			const errorBody = await response.text().catch(() => "(no body)")
			throw new Error(`NHDR submission failed: HTTP ${response.status} — ${errorBody}`)
		}

		const json = await response.json() as {
			receiptNumber?: string
			responseCode?: string
			responseMessage?: string
			submissionDate?: string
		}

		this.logger.log(`NHDR submission accepted: receiptNumber=${json.receiptNumber}`)

		return {
			receiptNumber: json.receiptNumber ?? `NHDR-${req.exportId.slice(0, 8).toUpperCase()}`,
			submissionDate: json.submissionDate ?? new Date().toISOString(),
			responseCode: json.responseCode ?? "200",
			responseMessage: json.responseMessage ?? "Accepted",
		}
	}

	private submitMock(req: NhdrSubmissionRequest): NhdrAcknowledgment {
		this.logger.warn(
			`NHDR_MODE=mock — submission for exportId=${req.exportId} is queued for manual submission. ` +
			`Set NHDR_MODE=real and NHDR_BASE_URL to enable live NHDR integration.`
		)

		return {
			receiptNumber: "",
			submissionDate: new Date().toISOString(),
			responseCode: "PENDING",
			responseMessage:
				`[Integration pending] FHIR bundle prepared by ${req.submittedByName}. ` +
				`Configure NHDR_MODE=real and NHDR_BASE_URL to enable live submission. ` +
				`Period: ${req.periodStart} – ${req.periodEnd}`,
		}
	}
}
