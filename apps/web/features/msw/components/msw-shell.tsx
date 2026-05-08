"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileBadge, HandHeart, HeartHandshake, Home, ShieldCheck } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { cn } from "@/core/lib/utils"

import { useAncillaryQueueQuery } from "../ancillary-clearance/api/clearance.hooks"
import { useMswEvaluationListQuery } from "../assessment-coe/api/assessment.hooks"

function AssessmentBadge() {
	const { data } = useMswEvaluationListQuery({ status: "pending", limit: 1 })
	const count = data?.total ?? 0
	if (count === 0) return null
	return (
		<Badge variant="secondary" className="ml-auto size-5 justify-center rounded-full p-0 text-xs">
			{count > 99 ? "99+" : count}
		</Badge>
	)
}

function AncillaryBadge() {
	const { data } = useAncillaryQueueQuery({})
	const count = data?.length ?? 0
	if (count === 0) return null
	return (
		<Badge variant="secondary" className="ml-auto size-5 justify-center rounded-full p-0 text-xs">
			{count > 99 ? "99+" : count}
		</Badge>
	)
}

const NAV_ITEMS = [
	{ href: "/msw", label: "Dashboard", icon: Home, Badge: null },
	{ href: "/msw/encounters", label: "Assessment & CoE", icon: HeartHandshake, Badge: AssessmentBadge },
	{ href: "/msw/signed-forms", label: "Annex Signatures", icon: FileBadge, Badge: null },
	{ href: "/msw/malasakit", label: "Malasakit Tracking", icon: HandHeart, Badge: null },
	{ href: "/msw/ancillary-clearance", label: "Ancillary Clearance", icon: ShieldCheck, Badge: AncillaryBadge },
]

interface MswShellProps {
	children: React.ReactNode
}

export function MswShell({ children }: MswShellProps) {
	const pathname = usePathname()

	return (
		<div className="absolute inset-0 flex overflow-hidden">
			<aside className="hidden w-56 shrink-0 border-r bg-sidebar lg:flex lg:flex-col">
				<div className="border-b px-4 py-3">
					<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						Medical Social Work
					</p>
				</div>
				<nav className="flex-1 space-y-0.5 p-2">
					{NAV_ITEMS.map(({ href, label, icon: Icon, Badge: NavBadge }) => {
						const isActive = href === "/msw" ? pathname === href : pathname.startsWith(href)
						return (
							<Link
								key={href}
								href={href}
								className={cn(
									"flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
									isActive
										? "bg-primary/10 font-medium text-primary"
										: "text-muted-foreground hover:bg-accent hover:text-foreground"
								)}
							>
								<Icon className="size-4 shrink-0" />
								<span className="flex-1">{label}</span>
								{NavBadge && <NavBadge />}
							</Link>
						)
					})}
				</nav>
			</aside>
			<main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
		</div>
	)
}
