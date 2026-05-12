/** confidence is 0-1 */
export function formatConfidencePct(confidence: number): string {
	if (confidence > 0.8) return "High (>80%)"
	if (confidence >= 0.5) return "Medium (50-80%)"
	return "Low (<50%)"
}

/** confidence is 0-1; returns e.g. "87% confidence" */
export function formatConfidence(confidence: number): string {
	return `${Math.round(confidence * 100)}% confidence`
}
