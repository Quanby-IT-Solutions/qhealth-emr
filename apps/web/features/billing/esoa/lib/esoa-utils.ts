export function formatEsoaVersion(version: number): string {
	return `Version ${version}`
}

export function formatSentVia(channel: string): string {
	const map: Record<string, string> = {
		email: "Email",
		portal: "Portal",
		print: "Print",
	}
	return map[channel.toLowerCase()] ?? channel
}
