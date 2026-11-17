const SCAN_ERROR_MESSAGES: Record<string, string> = {
	failedToGetHealthAnalysisResult:
		"Insight-Genie could not finish analysis. This is usually a temporary server issue, not face positioning. Wait a moment and try again.",
	failedToGetResults:
		"Scan results were not available from Insight-Genie. Please try again in a few seconds.",
	failedToGetVoiceAnalysisResult: "Voice analysis failed. Face scan vitals were not captured.",
	failedToLoadPage: "Camera scanner failed to load. Check camera permissions and try again.",
}

const SERVER_ANALYSIS_PATTERNS = [
	/\b503\b/,
	/service unavailable/i,
	/decryption error/i,
	/gethealthv2/i,
	/failed to get health analysis result/i,
]

export function formatFaceScanError(action: string, message?: string): string {
	const trimmed = message?.trim()
	if (trimmed) {
		if (SERVER_ANALYSIS_PATTERNS.some(pattern => pattern.test(trimmed))) {
			return (
				SCAN_ERROR_MESSAGES.failedToGetHealthAnalysisResult ??
				"Insight-Genie could not finish analysis. Please try again."
			)
		}
		return trimmed
	}
	return SCAN_ERROR_MESSAGES[action] ?? "Face scan did not complete. Please try again."
}

function newScanSessionId(): string {
	if (typeof crypto !== "undefined" && crypto.randomUUID) {
		return crypto.randomUUID()
	}
	return "00000000-0000-4000-8000-000000000001"
}

export { newScanSessionId }
