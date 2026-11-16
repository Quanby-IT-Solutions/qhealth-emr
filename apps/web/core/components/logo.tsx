"use client"

import * as React from "react"
import type { Route } from "next"
import Image from "next/image"
import Link from "next/link"

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
		alt = "Quanby Solutions, Inc.",
		icon: _icon,
		strokeWidth: _strokeWidth,
		...props
	}: LogoIconProps) => {
		// The round Quanby mark is a self-contained badge that reads correctly on
		// both light and dark surfaces, so no theme-dependent asset swap is needed.
		return (
			<Image
				ref={ref}
				src="/quanby-mark.png"
				alt={alt}
				width={512}
				height={512}
				className={cn("h-6 w-6 object-contain", className)}
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
	text = "Quanby",
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
