"use client"

import { Baby, ClipboardList, FlaskConical, PhoneCall } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { NbsLogbook } from "@/features/nbs/components/nbs-logbook"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(
		permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`)
	)
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

const FEATURES = [
	{
		icon: Baby,
		title: "Newborn Screening",
		description:
			"Initiate and track NBS screening for newborns within the 24–48 hour collection window; record specimen type, barcode, and collection timestamp.",
	},
	{
		icon: FlaskConical,
		title: "Panel Results",
		description:
			"Record results for six conditions: Congenital Hypothyroidism (CH), CAH, G6PD, Galactosemia, PKU, and MSUD with overall result classification.",
	},
	{
		icon: ClipboardList,
		title: "Consent & Waiver",
		description:
			"Capture parent or guardian signature for informed consent or waiver, with witness documentation and relationship recording.",
	},
	{
		icon: PhoneCall,
		title: "Referral Tracking",
		description:
			"Manage follow-up referrals for abnormal or positive results; track referral status from pending through accepted to completed.",
	},
]

export default function NbsPage() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles[0]?.facilityId ?? ""
	const permSet = usePermissionSet()

	if (!can(permSet, "nbs", "view")) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access the newborn screening module.
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Newborn Screening (NBS)</h1>
				<p className="text-muted-foreground text-sm">
					Specimen collection, panel results, consent documentation, and referral tracking
				</p>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				{FEATURES.map(({ icon: Icon, title, description }) => (
					<Card key={title}>
						<CardHeader className="flex flex-row items-center gap-3 pb-2">
							<div className="bg-primary/10 rounded-md p-2">
								<Icon className="text-primary size-5" />
							</div>
							<CardTitle className="text-sm font-medium">{title}</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground text-sm">{description}</p>
						</CardContent>
					</Card>
				))}
			</div>

			{facilityId && <NbsLogbook facilityId={facilityId} />}
		</div>
	)
}
