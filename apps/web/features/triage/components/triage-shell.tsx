"use client"

import type { ReactNode } from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/core/lib/utils"

const SUB_NAV = [
	{ label: "Dashboard", href: "/triage" },
	{ label: "Walk-in OPD", href: "/triage/new" },
	{ label: "Patients", href: "/patients/search" },
	{ label: "Emergency", href: "/ed" },
]

export function TriageShell({ children, roleName }: { children: ReactNode; roleName?: string }) {
	const pathname = usePathname()

	return (
		<div className="flex flex-col gap-0">
			<div className="flex items-center justify-between border-b bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300">
				<div className="flex items-center gap-2">
					<span className="size-2 rounded-full bg-cyan-500" aria-hidden />
					Triage
				</div>
				{roleName ? (
					<span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-medium text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300">
						{roleName}
					</span>
				) : null}
			</div>

			<nav className="flex gap-1 overflow-x-auto border-b px-4" aria-label="Triage sections">
				{SUB_NAV.map(item => {
					const active =
						item.href === "/triage" ? pathname === "/triage" : pathname.startsWith(item.href)
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
