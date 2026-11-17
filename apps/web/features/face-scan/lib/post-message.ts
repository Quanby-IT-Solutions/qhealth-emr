const IG_HOST_PATTERN = /(^|\.)insightgenie\.ai$/i

export function normalizePostMessageData(raw: unknown): Record<string, unknown> | null {
	if (raw == null) return null
	if (typeof raw === "string") {
		try {
			const parsed: unknown = JSON.parse(raw)
			if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
				return parsed as Record<string, unknown>
			}
		} catch {
			return null
		}
		return null
	}
	if (typeof raw === "object" && !Array.isArray(raw)) {
		return raw as Record<string, unknown>
	}
	return null
}

export function getPostMessageAction(data: Record<string, unknown>): string | undefined {
	const raw = data.action ?? data.type ?? data.event ?? data.name
	return typeof raw === "string" ? raw : undefined
}

export function isInsightGeniePostMessage(
	event: MessageEvent,
	iframe: HTMLIFrameElement | null
): boolean {
	if (iframe && event.source === iframe.contentWindow) return true
	if (typeof event.origin !== "string") return false
	try {
		return IG_HOST_PATTERN.test(new URL(event.origin).hostname)
	} catch {
		return event.origin.includes("insightgenie.ai")
	}
}
