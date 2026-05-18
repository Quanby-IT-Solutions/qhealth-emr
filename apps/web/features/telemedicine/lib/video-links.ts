import {
	getPlatformLabel,
	type TelemedicinePlatform,
} from "@/features/telemedicine/api/telemedicine.hooks"

const PLATFORM_HOSTS: Record<TelemedicinePlatform, string[]> = {
	zoom: ["zoom.us", "zoom.com", "zoomgov.com"],
	teams: ["teams.microsoft.com", "teams.live.com", "teams.microsoft.us", "teams.cloud.microsoft"],
}

function isAllowedHost(hostname: string, platform: TelemedicinePlatform) {
	const normalizedHost = hostname.toLowerCase()
	return PLATFORM_HOSTS[platform].some(host => normalizedHost === host || normalizedHost.endsWith(`.${host}`))
}

export function getVideoLaunchPath(appointmentId: string) {
	return `/telemedicine/appointments/${appointmentId}/video`
}

export function isValidVideoLinkForPlatform(value: string, platform: TelemedicinePlatform) {
	try {
		const url = new URL(value)
		return url.protocol === "https:" && isAllowedHost(url.hostname, platform)
	} catch {
		return false
	}
}

export function getVideoLinkValidationMessage(platform: TelemedicinePlatform) {
	return `Enter a valid HTTPS ${getPlatformLabel(platform)} meeting link.`
}
