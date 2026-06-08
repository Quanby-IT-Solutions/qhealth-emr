"use client"

import * as React from "react"
import type { Route } from "next"
import Image from "next/image"
import Link from "next/link"
import { useTheme } from "next-themes"

import { buttonVariants, type ButtonVariants } from "@/core/components/ui/button"
import { cn } from "@/core/lib/utils"

export interface LogoIconProps extends Omit<
	React.ComponentPropsWithoutRef<typeof Image>,
	"src" | "width" | "height" | "alt"
> {
	alt?: string
	icon?: unknown
	strokeWidth?: number
	ref?: React.Ref<HTMLImageElement>
}

export const LogoIcon = React.memo(
	({
		className,
		ref,
		alt = "Peregrine Eye and Laser Institute",
		icon: _icon,
		strokeWidth: _strokeWidth,
		...props
	}: LogoIconProps) => {
		const { resolvedTheme } = useTheme()
		const [mounted, setMounted] = React.useState(false)

		React.useEffect(() => setMounted(true), [])

		return (
			<Image
				ref={ref}
				src={mounted && resolvedTheme === "dark" ? "/peregrinedark.svg" : "/peregrine.svg"}
				alt={alt}
				width={2048}
				height={461}
				className={cn("h-6 w-auto max-w-[11rem] object-contain", className)}
				{...props}
			/>
		)
	}
)
LogoIcon.displayName = "LogoIcon"

export interface LogoProps {
	text?: string
	href?: Route<string>
	showIcon?: boolean
	showText?: boolean
	icon?: unknown
	strokeWidth?: number
	size?: ButtonVariants["size"]
	variant?: ButtonVariants["variant"]
	className?: string
}

export function Logo({
	text = "Peregrine",
	href,
	size = "lg",
	variant = "link",
	showIcon = true,
	showText = true,
	icon,
	strokeWidth,
	className,
}: LogoProps) {
	const content = (
		<>
			{showIcon && <LogoIcon icon={icon} strokeWidth={strokeWidth} data-icon="inline-start" />}
			{showText && text}
		</>
	)

	if (href) {
		return (
			<Link
				className={cn(buttonVariants({ size, variant }), "text-foreground", className)}
				href={href}
			>
				{content}
			</Link>
		)
	}

	// When no href, render as a span to avoid nested button issues
	// (e.g., when used inside SidebarMenuButton which is already a button)
	return (
		<span className={cn(buttonVariants({ size, variant }), "text-foreground", className)}>
			{content}
		</span>
	)
}
