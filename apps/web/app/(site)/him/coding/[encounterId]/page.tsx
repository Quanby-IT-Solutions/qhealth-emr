"use client"

import { useParams } from "next/navigation"

import { CodingPage } from "@/features/him/icd10-coding/components/coding-page"

export default function HimCodingEncounterPage() {
	const params = useParams<{ encounterId: string }>()
	return <CodingPage encounterId={params.encounterId} />
}
