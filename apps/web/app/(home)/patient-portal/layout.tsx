import type { Metadata } from "next"
import Link from "next/link"
import { Download, FileText, LockKeyhole, ShieldCheck } from "lucide-react"

import { PatientPortalLinkButton } from "@/features/patient-portal/components/patient-portal-link-button"

export const metadata: Metadata = {
	title: "Patient Portal | QHealth EMR",
	description: "Secure read-only patient access to released daily medical record summaries.",
}

export default function PatientPortalLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<main className="bg-background text-foreground min-h-screen">
			<header className="bg-card/80 border-b backdrop-blur">
				<div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
					<Link href="/patient-portal/login" className="flex items-center gap-3">
						<span className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-lg">
							<ShieldCheck className="size-5" />
						</span>
						<span>
							<span className="block text-base font-semibold">QHealth Patient Portal</span>
							<span className="text-muted-foreground block text-xs">
								Read-only released record access
							</span>
						</span>
					</Link>

					<nav className="flex flex-wrap items-center gap-2">
						<PatientPortalLinkButton
							href="/patient-portal/login"
							variant="ghost"
							size="sm"
							className="gap-1.5"
						>
							<LockKeyhole className="size-4" />
							Login
						</PatientPortalLinkButton>
						<PatientPortalLinkButton
							href="/patient-portal/summary"
							variant="ghost"
							size="sm"
							className="gap-1.5"
						>
							<FileText className="size-4" />
							Summary
						</PatientPortalLinkButton>
					</nav>
				</div>
			</header>
			{children}
		</main>
	)
}
