import { BadRequestException } from "@nestjs/common"

export type TelemedicineVideoPlatform = "zoom" | "teams"

const PLATFORM_HOSTS: Record<TelemedicineVideoPlatform, string[]> = {
	zoom: ["zoom.us", "zoom.com", "zoomgov.com"],
	teams: ["teams.microsoft.com", "teams.live.com", "teams.microsoft.us", "teams.cloud.microsoft"],
}

function isAllowedHost(hostname: string, allowedHosts: string[]) {
	const normalizedHost = hostname.toLowerCase()
	return allowedHosts.some(host => normalizedHost === host || normalizedHost.endsWith(`.${host}`))
}

export function assertTelemedicineVideoLink(
	videoLink?: string | null,
	platform?: TelemedicineVideoPlatform
) {
	if (!videoLink) return

	let url: URL
	try {
		url = new URL(videoLink)
	} catch {
		throw new BadRequestException("Video link must be a valid HTTPS URL.")
	}

	if (url.protocol !== "https:" || !url.hostname) {
		throw new BadRequestException("Video link must be a valid HTTPS URL.")
	}

	if (platform && !isAllowedHost(url.hostname, PLATFORM_HOSTS[platform])) {
		const label = platform === "zoom" ? "Zoom" : "Microsoft Teams"
		throw new BadRequestException(`Video link must use an approved ${label} meeting domain.`)
	}
}
