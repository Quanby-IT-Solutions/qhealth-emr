"use client"

import { useParams } from "next/navigation"

import { RecordsRequestDetailPage } from "@/features/him/records-issuance/components/records-request-detail-page"

export default function HimRecordsRequestDetailPage() {
	const params = useParams<{ requestId: string }>()
	return <RecordsRequestDetailPage requestId={params.requestId} />
}
