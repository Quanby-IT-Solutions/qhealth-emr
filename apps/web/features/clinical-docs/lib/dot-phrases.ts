export const DOT_PHRASES: Record<string, string> = {
	".hpi": "History of Present Illness:\n",
	".cc": "Chief Complaint:\n",
	".ros": "Review of Systems:\n",
	".pe": "Physical Examination:\n",
	".ap": "Assessment and Plan:\n",
}

export function expandDotPhrase(text: string): string | null {
	for (const [phrase, expansion] of Object.entries(DOT_PHRASES)) {
		const escaped = phrase.replace(/\./g, "\\.")
		const pattern = new RegExp(`(^|\\s)(${escaped})([ \\n,.:])$`)
		const match = pattern.exec(text)
		if (match) {
			const before = text.slice(0, match.index)
			const prefix = match[1]
			return before + prefix + expansion
		}
	}
	return null
}
