"use client"

import type { ReactNode } from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/core/lib/utils"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

const SUB_NAV = [
	{ label: "Charge Capture", href: "/billing/encounters" },
	{ label: "Invoice & Payment", href: "/billing/invoice" },
	{ label: "CF4 / eClaims", href: "/billing/cf4" },
	{ label: "DRG / CF5", href: "/billing/drg" },
	{ label: "eSOA", href: "/billing/esoa" },
	{ label: "CEWS Eligibility", href: "/billing/eligibility-check" },
	{ label: "Konsulta Capitation", href: "/billing/konsulta" },
]

function useCanBilling() {
	const { data: profile, isLoading } = useMyProfile()
	const perms = profile?.activeRole?.permissions ?? []
	const set = new Set(perms.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
	const roleName = profile?.activeRole?.name ?? ""
	return {
		allowed: set.has("billing:view"),
		loading: isLoading,
		roleName,
	}
}

export function BillingShell({ children }: { children: ReactNode }) {
	const pathname = usePathname()
	const { allowed, loading, roleName } = useCanBilling()

	if (loading) return null

	if (!allowed) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to access the billing module.
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-0">
			{/* Role badge banner */}
			<div className="flex items-center justify-between border-b bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
				<div className="flex items-center gap-2">
					<span className="size-2 rounded-full bg-blue-500" aria-hidden />
					Billing & Revenue Cycle Management
				</div>
				{roleName && (
					<span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
						{roleName}
					</span>
				)}
			</div>

			{/* Sub-navigation */}
			<nav className="flex gap-1 overflow-x-auto border-b px-4" aria-label="Billing sections">
				{SUB_NAV.map(item => {
					const active = pathname.startsWith(item.href)
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
