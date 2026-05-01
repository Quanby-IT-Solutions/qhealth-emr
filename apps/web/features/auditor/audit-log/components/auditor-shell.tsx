"use client"

import type { ReactNode } from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/core/lib/utils"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

const SUB_NAV = [
	{ label: "Audit Log", href: "/auditor/audit-log" },
	{ label: "Break-Glass Reviews", href: "/auditor/break-glass" },
]

function useCanAudit() {
	const { data: profile, isLoading } = useMyProfile()
	const perms = profile?.activeRole?.permissions ?? []
	const set = new Set(perms.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
	return { allowed: set.has("audit:view"), loading: isLoading }
}

export function AuditorShell({ children }: { children: ReactNode }) {
	const pathname = usePathname()
	const { allowed, loading } = useCanAudit()

	if (loading) return null

	if (!allowed) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to access the auditor module.
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-0">
			{/* Read-only banner */}
			<div className="flex items-center gap-2 border-b bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
				<span className="size-2 rounded-full bg-amber-500" aria-hidden />
				Read-only access — Auditor / Privacy Officer
			</div>

			{/* Sub-navigation */}
			<nav className="flex gap-1 border-b px-4" aria-label="Auditor sections">
				{SUB_NAV.map(item => {
					const active = pathname.startsWith(item.href)
					return (
						<Link
							key={item.href}
							href={item.href}
							className={cn(
								"border-b-2 px-3 py-2 text-sm font-medium transition-colors",
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
