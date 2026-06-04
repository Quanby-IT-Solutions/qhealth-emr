"use client"

import type { ReactNode } from "react"

import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/core/components/ui/sheet"

interface FormSheetProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	title: string
	description?: string
	side?: "left" | "right"
	children: ReactNode
	footer?: ReactNode
}

export function FormSheet({
	open,
	onOpenChange,
	title,
	description,
	side = "right",
	children,
	footer,
}: FormSheetProps) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side={side} className="flex w-full max-w-lg flex-col gap-0 p-0 sm:max-w-xl">
				<SheetHeader className="border-b px-4 py-3">
					<SheetTitle className="text-sm font-semibold">{title}</SheetTitle>
					{description && <SheetDescription className="text-xs">{description}</SheetDescription>}
				</SheetHeader>
				<div className="flex-1 overflow-y-auto p-4">{children}</div>
				{footer && (
					<div className="bg-muted/30 flex items-center justify-end gap-2 border-t px-4 py-2">
						{footer}
					</div>
				)}
			</SheetContent>
		</Sheet>
	)
}
