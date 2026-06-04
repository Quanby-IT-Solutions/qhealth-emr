"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Badge } from "@/core/components/ui/badge"
import { cn } from "@/core/lib/utils"
import { useHimQueueCounts } from "@/features/him/lib/him-queue-badges"

export function HimShell({ children, roleName }: { children: ReactNode; roleName?: string }) {
	const pathname = usePathname()
	const counts = useHimQueueCounts()

	const SUB_NAV = [
		{ label: "Dashboard", href: "/him", count: null as number | null },
		{ label: "Deficiencies", href: "/him/deficiencies", count: counts.openDeficiencies },
		{ label: "Coding", href: "/him/coding/lookup", count: counts.pendingCoding },
		{
			label: "Records Requests",
			href: "/him/records-requests",
			count: counts.pendingRecordsRequests,
		},
		{ label: "HAI", href: "/him/hai", count: counts.pendingHaiReview },
	]

	return (
		<div className="flex flex-col gap-0">
			<div className="flex items-center justify-between border-b bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
				<div className="flex items-center gap-2">
					<span className="size-2 rounded-full bg-emerald-500" aria-hidden />
					Health Information Management
				</div>
				{roleName && (
					<span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
						{roleName}
					</span>
				)}
			</div>

			<nav className="flex gap-1 overflow-x-auto border-b px-4" aria-label="HIM sections">
				{SUB_NAV.map(item => {
					const active = item.href === "/him" ? pathname === "/him" : pathname.startsWith(item.href)
					return (
						<Link
							key={item.href}
							href={item.href}
							className={cn(
								"flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
								active
									? "border-primary text-foreground"
									: "text-muted-foreground hover:text-foreground border-transparent"
							)}
						>
							{item.label}
							{item.count !== null && item.count > 0 && (
								<Badge variant={active ? "default" : "secondary"} className="px-1.5 text-[10px]">
									{item.count > 99 ? "99+" : item.count}
								</Badge>
							)}
						</Link>
					)
				})}
			</nav>

			<div className="p-4">{children}</div>
		</div>
	)
}
