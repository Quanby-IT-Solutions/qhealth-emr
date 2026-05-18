"use client"

import { use } from "react"

import { VideoLinkLaunchPage } from "@/features/telemedicine/components/video-link-launch-page"

export default function TelemedicineVideoLaunchRoute({
	params,
}: {
	params: Promise<{ appointmentId: string }>
}) {
	const { appointmentId } = use(params)
	return <VideoLinkLaunchPage appointmentId={appointmentId} />
}
