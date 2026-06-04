"use client"

import { useEffect, useState } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { useTheme } from "next-themes"

import { DevQuickLogin } from "@/features/auth/components/dev-quick-login"
import { LoginForm } from "@/features/auth/login/components/login-form"

// SVG Theme Toggle matching the Landing page
function ThemeToggle() {
	const { resolvedTheme, setTheme } = useTheme()
	const [mounted, setMounted] = useState(false)
	const isDark = resolvedTheme === "dark"

	useEffect(() => setMounted(true), [])

	if (!mounted) return null

	return (
		<button
			onClick={() => setTheme(isDark ? "light" : "dark")}
			className="border-border bg-card hover:bg-accent/10 fixed top-6 right-6 z-50 flex h-8 w-14 cursor-pointer items-center rounded-full border p-1 shadow-sm transition-colors"
			aria-label="Toggle Dark Mode"
		>
			<motion.div
				className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full shadow-sm"
				layout
				transition={{ type: "spring", stiffness: 700, damping: 30 }}
				style={{ marginLeft: isDark ? "auto" : "0" }}
			>
				{isDark ? (
					<svg
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
					</svg>
				) : (
					<svg
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<circle cx="12" cy="12" r="5" />
						<line x1="12" y1="1" x2="12" y2="3" />
						<line x1="12" y1="21" x2="12" y2="23" />
						<line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
						<line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
						<line x1="1" y1="12" x2="3" y2="12" />
						<line x1="21" y1="12" x2="23" y2="12" />
						<line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
						<line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
					</svg>
				)}
			</motion.div>
		</button>
	)
}

function BlueprintBackground() {
	const { scrollY } = useScroll()
	const y = useTransform(scrollY, [0, 1000], [0, 50])

	return (
		<motion.div
			className="pointer-events-none fixed inset-0 opacity-[0.03] dark:opacity-[0.05]"
			style={{ y }}
		>
			<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
				<defs>
					<pattern id="blueprintGrid" width="40" height="40" patternUnits="userSpaceOnUse">
						<path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
					</pattern>
				</defs>
				<rect width="100%" height="100%" fill="url(#blueprintGrid)" />
			</svg>
		</motion.div>
	)
}

export default function LoginPage() {
	return (
		<div className="bg-background relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
			<ThemeToggle />

			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.8 }}
				className="pointer-events-none absolute inset-0"
			>
				<BlueprintBackground />
			</motion.div>

			<section className="relative z-10 flex w-full max-w-[820px] flex-col items-center justify-center gap-4 px-4 py-12 md:px-8">
				<motion.div
					className="w-full"
					initial={{ opacity: 0, y: 30, scale: 0.98 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.3 }}
				>
					<LoginForm className="w-full" />
				</motion.div>

				<motion.div
					className="w-full"
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 1.0 }}
				>
					<DevQuickLogin />
				</motion.div>
			</section>
		</div>
	)
}
