import { describe, expect, it } from "vitest"

import { formatFaceScanError, newScanSessionId } from "./face-scan-errors"

describe("face-scan-errors", () => {
	it("maps known IG failure actions to friendly copy", () => {
		expect(formatFaceScanError("failedToGetHealthAnalysisResult")).toContain(
			"temporary server issue"
		)
	})

	it("maps IG server-side analysis failures from payload message", () => {
		expect(
			formatFaceScanError("failedToGetHealthAnalysisResult", "503 Service Unavailable")
		).toContain("temporary server issue")
	})

	it("prefers explicit message from payload", () => {
		expect(formatFaceScanError("failedToGetResults", "Custom error")).toBe("Custom error")
	})

	it("generates uuid scan session ids in browser-like env", () => {
		expect(newScanSessionId()).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
		)
	})
})
