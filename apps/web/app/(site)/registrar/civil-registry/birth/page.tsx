"use client"

import { Suspense } from "react"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { BirthCertificateForm } from "@/features/registrar/civil-registry/components/birth-certificate-form"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(
		permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`)
	)
}

export default function BirthCertificatePage() {
	const permSet = usePermissionSet()

	if (!permSet.has("civil_registry:create")) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to create birth registrations.
			</div>
		)
	}

	return (
		<Suspense>
			<BirthCertificateForm />
		</Suspense>
	)
}
