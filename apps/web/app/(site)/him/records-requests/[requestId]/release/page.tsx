"use client"

import { useParams } from "next/navigation"

import { ReleaseWorkflowPage } from "@/features/him/records-issuance/components/release-workflow-page"

export default function HimReleaseWorkflowPage() {
	const params = useParams<{ requestId: string }>()
	return <ReleaseWorkflowPage requestId={params.requestId} />
}
