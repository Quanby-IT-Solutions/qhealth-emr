"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, AlertTriangle, BarChart3, TrendingUp } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { cn } from "@/core/lib/utils"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useSurveillanceFlagsQuery } from "@/features/surveillance/pidsr/api/pidsr.hooks"

function PidsrBadge() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId
	const { data } = useSurveillanceFlagsQuery({ facilityId: facilityId ?? "", isReviewed: false, limit: 1 })
	const count = data?.total ?? 0
	if (!facilityId || count === 0) return null
	return (
		<Badge variant="destructive" className="ml-auto size-5 justify-center rounded-full p-0 text-xs">
			{count > 99 ? "99+" : count}
		</Badge>
	)
}

const NAV_ITEMS = [
	{ href: "/surveillance", label: "Dashboard", icon: Activity, Badge: null },
	{ href: "/surveillance/pidsr", label: "PIDSR Alerts", icon: AlertTriangle, Badge: PidsrBadge },
	{ href: "/surveillance/ahsr", label: "AHSR", icon: BarChart3, Badge: null },
	{ href: "/surveillance/mortality-morbidity", label: "Mortality & Morbidity", icon: TrendingUp, Badge: null },
]

interface SurveillanceShellProps {
	children: React.ReactNode
}

export function SurveillanceShell({ children }: SurveillanceShellProps) {
	const pathname = usePathname()

	return (
		<div className="flex w-full min-h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-border bg-background shadow-sm">
			<aside className="hidden w-60 shrink-0 border-r border-border bg-sidebar/30 lg:flex lg:flex-col">
				<div className="border-b border-border bg-sidebar/50 px-4 py-4">
					<p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
						Surveillance
					</p>
				</div>
				<nav className="flex-1 space-y-1 p-3 custom-scrollbar overflow-y-auto">
					{NAV_ITEMS.map(({ href, label, icon: Icon, Badge: NavBadge }) => {
						const isActive =
							href === "/surveillance" ? pathname === href : pathname.startsWith(href)
						return (
							<Link
								key={href}
								href={href}
								className={cn(
									"flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring",
									isActive
										? "bg-primary/10 font-semibold text-primary shadow-sm"
										: "text-muted-foreground hover:bg-accent/50 hover:text-foreground font-medium"
								)}
							>
								<Icon className={cn("size-4 shrink-0 transition-colors", isActive ? "text-primary" : "opacity-70")} />
								<span className="flex-1 truncate">{label}</span>
								{NavBadge && <NavBadge />}
							</Link>
						)
					})}
				</nav>
			</aside>
			<main className="flex-1 overflow-auto bg-background/50 p-6 md:p-8 custom-scrollbar">
				{children}
			</main>
		</div>
	)
}
