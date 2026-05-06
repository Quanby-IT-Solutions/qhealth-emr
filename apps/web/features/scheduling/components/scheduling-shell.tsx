"use client"

import type { ReactNode } from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/core/lib/utils"

const SCHEDULING_SUB_NAV = [
	{ label: "Templates", href: "/scheduling/templates" },
	{ label: "Slots", href: "/scheduling/slots" },
]

export function SchedulingShell({
	children,
	roleName,
}: {
	children: ReactNode
	roleName?: string
}) {
	const pathname = usePathname()

	return (
		<div className="flex flex-col gap-0">
			<div className="flex items-center justify-between border-b bg-sky-50 px-4 py-2 text-sm font-medium text-sky-900">
				<div className="flex items-center gap-2">
					<span className="size-2 rounded-full bg-sky-500" aria-hidden />
					Scheduling Workspace
				</div>
				{roleName ? (
					<span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
						{roleName}
					</span>
				) : null}
			</div>

			<nav className="flex gap-1 overflow-x-auto border-b px-4" aria-label="Scheduling sections">
				{SCHEDULING_SUB_NAV.map(item => {
					const active = pathname === item.href || pathname.startsWith(`${item.href}/`)

					return (
						<Link
							key={item.href}
							href={item.href}
							className={cn(
								"whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
								active
									? "border-primary text-foreground"
									: "border-transparent text-muted-foreground hover:text-foreground"
							)}
						>
							{item.label}
						</Link>
					)
				})}
			</nav>

			<div className="p-4">{children}</div>
		</div>
	)
}
