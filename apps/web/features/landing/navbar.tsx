"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion"
import { useTheme } from "next-themes"

export function Navbar() {
	const { resolvedTheme, setTheme } = useTheme()
	const isDark = resolvedTheme === "dark"
	const [mounted, setMounted] = useState(false)
	const { scrollY } = useScroll()
	const [scrolled, setScrolled] = useState(false)
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

	useEffect(() => setMounted(true), [])

	useMotionValueEvent(scrollY, "change", latest => {
		setScrolled(latest > 50)
	})

	const navLinks = [
		{ name: "Modules", href: "#modules" },
		{ name: "Compliance", href: "#compliance" },
		{ name: "Workflows", href: "#workflows" },
		{ name: "Interoperability", href: "#interoperability" },
	]

	return (
		<motion.header
			className={`fixed inset-x-0 top-0 z-50 flex h-20 items-center justify-center transition-colors duration-300 ${
				scrolled ? "bg-background/85 border-border/50 border-b backdrop-blur-md" : "bg-transparent"
			}`}
			initial={{ y: -100 }}
			animate={{ y: 0 }}
			transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
		>
			<div className="container mx-auto flex w-full max-w-7xl items-center justify-between px-6">
				{/* Logo */}
				<Link href="/" className="group flex items-center gap-3">
					<svg
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						className="text-primary"
					>
						<rect
							x="2"
							y="2"
							width="20"
							height="20"
							rx="4"
							stroke="currentColor"
							strokeWidth="1.5"
						/>
						<path
							d="M12 7V17M7 12H17"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
						/>
					</svg>
					<span className="font-serif text-xl font-bold tracking-tight">QHealth</span>
				</Link>

				{/* Desktop Nav */}
				<nav className="hidden items-center gap-8 text-sm font-medium md:flex">
					{navLinks.map(link => (
						<Link
							key={link.name}
							href={link.href}
							className="group text-foreground/80 hover:text-foreground relative transition-colors"
						>
							{link.name}
							<span className="bg-primary absolute -bottom-1 left-0 h-[1.5px] w-full origin-center scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100" />
						</Link>
					))}
				</nav>

				{/* Actions */}
				<div className="hidden items-center gap-4 md:flex">
					{mounted && (
						<button
							onClick={() => setTheme(isDark ? "light" : "dark")}
							className="border-border bg-card relative flex h-8 w-14 cursor-pointer items-center rounded-full border p-1 shadow-sm transition-colors"
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
					)}

					<Link
						href="/login"
						className="border-border text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex items-center justify-center rounded-md border bg-transparent px-4 py-2 text-sm font-medium shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
					>
						Sign In
					</Link>

					<Link
						href="#briefing"
						className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow transition-colors focus-visible:ring-1 focus-visible:outline-none"
					>
						Request Briefing
					</Link>
				</div>

				{/* Mobile Menu Toggle */}
				<button
					className="flex h-8 w-8 flex-col items-center justify-center gap-[4px] md:hidden"
					onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
				>
					<motion.span
						animate={{ rotate: mobileMenuOpen ? 45 : 0, y: mobileMenuOpen ? 6 : 0 }}
						className="bg-foreground block h-[1.5px] w-6 rounded-full transition-transform"
					/>
					<motion.span
						animate={{ opacity: mobileMenuOpen ? 0 : 1 }}
						className="bg-foreground block h-[1.5px] w-6 rounded-full transition-opacity"
					/>
					<motion.span
						animate={{ rotate: mobileMenuOpen ? -45 : 0, y: mobileMenuOpen ? -6 : 0 }}
						className="bg-foreground block h-[1.5px] w-6 rounded-full transition-transform"
					/>
				</button>
			</div>

			{/* Mobile Menu Overlay */}
			<AnimatePresence>
				{mobileMenuOpen && (
					<motion.div
						className="bg-background border-border fixed inset-0 top-20 z-40 flex flex-col gap-6 border-t p-6"
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
					>
						<nav className="flex flex-col gap-4 text-lg font-medium">
							{navLinks.map(link => (
								<Link
									key={link.name}
									href={link.href}
									className="text-foreground/80 hover:text-foreground"
									onClick={() => setMobileMenuOpen(false)}
								>
									{link.name}
								</Link>
							))}
						</nav>
						<div className="border-border mt-auto flex flex-col gap-3 border-t pt-6">
							<Link
								href="/login"
								className="border-border text-foreground hover:bg-accent inline-flex items-center justify-center rounded-md border bg-transparent px-4 py-2 text-sm font-medium transition-colors"
								onClick={() => setMobileMenuOpen(false)}
							>
								Sign In
							</Link>
							<Link
								href="#briefing"
								className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors"
								onClick={() => setMobileMenuOpen(false)}
							>
								Request Briefing
							</Link>
							{mounted && (
								<button
									onClick={() => setTheme(isDark ? "light" : "dark")}
									className="text-muted-foreground flex items-center gap-3 text-sm font-medium"
								>
									{isDark ? "Light Mode" : "Dark Mode"}
								</button>
							)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.header>
	)
}
