"use client"

import { use } from "react"

import { Cf5Page as Cf5PageComponent } from "@/features/billing/drg-cf5/components/cf5-page"

export default function Cf5Page({ params }: { params: Promise<{ encounterId: string }> }) {
	const { encounterId } = use(params)

	return <Cf5PageComponent encounterId={encounterId} />
}
