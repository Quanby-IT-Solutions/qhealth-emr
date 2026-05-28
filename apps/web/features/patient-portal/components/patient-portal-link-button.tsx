"use client"

import type { ComponentProps } from "react"
import Link from "next/link"

import { buttonVariants, type ButtonVariants } from "@/core/components/ui/button"
import { cn } from "@/core/lib/utils"

type PatientPortalLinkButtonProps = ComponentProps<typeof Link> & ButtonVariants

export function PatientPortalLinkButton({
	className,
	variant = "default",
	size = "default",
	...props
}: PatientPortalLinkButtonProps) {
	return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

type PatientPortalDownloadButtonProps = ComponentProps<"a"> & ButtonVariants

export function PatientPortalDownloadButton({
	className,
	variant = "default",
	size = "default",
	...props
}: PatientPortalDownloadButtonProps) {
	return <a className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
