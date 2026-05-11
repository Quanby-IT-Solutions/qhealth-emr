"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/core/lib/utils"

export function SchedulingShell({
	children,
	roleName: _roleName,
}: {
	children: ReactNode
	roleName?: string
}) {
	const pathname = usePathname()

	return (
		<div className="flex flex-col gap-0">
			<div className="p-4">{children}</div>
		</div>
	)
}
