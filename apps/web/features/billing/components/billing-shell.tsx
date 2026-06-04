"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/core/lib/utils"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

// Top-level nav links only.
// Encounter-scoped flows (Charge Capture, Invoice & Payment, CF4/eClaims, DRG/CF5, eSOA)
// require an encounter id and are reached from the patient chart or billing dashboard.
const SUB_NAV = [
	{ label: "Dashboard", href: "/billing", exact: true },
	{ label: "CEWS Eligibility", href: "/billing/eligibility-check" },
	{ label: "Konsulta Capitation", href: "/billing/konsulta" },
]

const BILLING_GRANULAR_READ_PERMS = [
	"billing.charges:read",
	"billing.invoices:read",
	"billing.payments:read",
	"billing.cf4:read",
	"billing.drg:read",
	"billing.cf5:read",
	"billing.esoa:read",
	"billing.cews:read",
	"billing.konsulta:read",
] as const

function useCanBilling() {
	const { data: profile, isLoading } = useMyProfile()
	const perms = profile?.activeRole?.permissions ?? []
	const set = new Set(
		perms.map((p: { module: string; action: string }) => `${p.module}:${p.action}`)
	)
	const roleName = profile?.activeRole?.name ?? ""
	const hasLegacy = set.has("billing:view")
	const hasGranular = BILLING_GRANULAR_READ_PERMS.some(p => set.has(p))
	return {
		allowed: hasLegacy || hasGranular,
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
			<div className="text-muted-foreground flex items-center justify-center p-8">
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
					const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
					return (
						<Link
							key={item.href}
							href={item.href}
							className={cn(
								"border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
								active
									? "border-primary text-foreground"
									: "text-muted-foreground hover:text-foreground border-transparent"
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
