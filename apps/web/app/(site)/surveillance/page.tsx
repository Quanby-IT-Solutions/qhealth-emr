import { Activity, AlertTriangle, BarChart3, TrendingUp } from "lucide-react"
import Link from "next/link"

import { Card, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"

const MODULES = [
	{
		href: "/surveillance/pidsr",
		title: "PIDSR Alerts",
		description:
			"Philippine Integrated Disease Surveillance and Response — notifiable disease alerts and case management",
		icon: AlertTriangle,
	},
	{
		href: "/surveillance/ahsr",
		title: "AHSR Dashboard",
		description:
			"Annual Hospital Statistical Report — admissions, deaths, readiness tracking and export",
		icon: BarChart3,
	},
	{
		href: "/surveillance/mortality-morbidity",
		title: "Mortality & Morbidity",
		description: "Top-10 causes of death and morbidity with demographic breakdowns",
		icon: TrendingUp,
	},
]

export default function SurveillancePage() {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<Activity className="size-5 text-primary" />
				<div>
					<h1 className="text-xl font-semibold">Surveillance Dashboard</h1>
					<p className="text-sm text-muted-foreground">
						SUR-FE-01 · Disease surveillance and hospital reporting
					</p>
				</div>
			</div>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{MODULES.map((m) => (
					<Link key={m.href} href={m.href}>
						<Card className="h-full transition-shadow hover:shadow-md">
							<CardHeader>
								<div className="flex items-center gap-2">
									<m.icon className="size-5 text-primary" />
									<CardTitle className="text-base">{m.title}</CardTitle>
								</div>
								<CardDescription>{m.description}</CardDescription>
							</CardHeader>
						</Card>
					</Link>
				))}
			</div>
		</div>
	)
}
