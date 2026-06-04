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
	const { data } = useSurveillanceFlagsQuery({
		facilityId: facilityId ?? "",
		isReviewed: false,
		limit: 1,
	})
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
	{
		href: "/surveillance/mortality-morbidity",
		label: "Mortality & Morbidity",
		icon: TrendingUp,
		Badge: null,
	},
]

interface SurveillanceShellProps {
	children: React.ReactNode
}

export function SurveillanceShell({ children }: SurveillanceShellProps) {
	const pathname = usePathname()

	return (
		<div className="border-border bg-background flex min-h-[calc(100vh-8rem)] w-full overflow-hidden rounded-xl border shadow-sm">
			<aside className="border-border bg-sidebar/30 hidden w-60 shrink-0 border-r lg:flex lg:flex-col">
				<div className="border-border bg-sidebar/50 border-b px-4 py-4">
					<p className="text-muted-foreground text-[11px] font-bold tracking-widest uppercase">
						Surveillance
					</p>
				</div>
				<nav className="custom-scrollbar flex-1 space-y-1 overflow-y-auto p-3">
					{NAV_ITEMS.map(({ href, label, icon: Icon, Badge: NavBadge }) => {
						const isActive =
							href === "/surveillance" ? pathname === href : pathname.startsWith(href)
						return (
							<Link
								key={href}
								href={href}
								className={cn(
									"focus-visible:ring-ring flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all duration-200 outline-none focus-visible:ring-2",
									isActive
										? "bg-primary/10 text-primary font-semibold shadow-sm"
										: "text-muted-foreground hover:bg-accent/50 hover:text-foreground font-medium"
								)}
							>
								<Icon
									className={cn(
										"size-4 shrink-0 transition-colors",
										isActive ? "text-primary" : "opacity-70"
									)}
								/>
								<span className="flex-1 truncate">{label}</span>
								{NavBadge && <NavBadge />}
							</Link>
						)
					})}
				</nav>
			</aside>
			<main className="bg-background/50 custom-scrollbar flex-1 overflow-auto p-6 md:p-8">
				{children}
			</main>
		</div>
	)
}
