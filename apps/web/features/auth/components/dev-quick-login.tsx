"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Terminal } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { useLoginMutation } from "@/features/auth/login/api/login.hooks"
import { authClient } from "@/services/better-auth/auth-client"
import { cn } from "@/core/lib/utils"

const DEV_ACCOUNTS = [
	{ email: "admin@qhealth.local", label: "Administrator", category: "Admin" },
	{ email: "registrar@qhealth.local", label: "Registrar", category: "ADT" },
	{ email: "scheduler@qhealth.local", label: "Scheduler", category: "ADT" },
	{ email: "triage@qhealth.local", label: "Triage Officer", category: "Emergency" },
	{ email: "doctor@qhealth.local", label: "Physician", category: "Clinical" },
	{ email: "surgeon@qhealth.local", label: "Surgeon", category: "Clinical" },
	{ email: "anesthesiologist@qhealth.local", label: "Anesthesiologist", category: "Clinical" },
	{ email: "nurse@qhealth.local", label: "Nurse", category: "Nursing" },
	{ email: "dietitian@qhealth.local", label: "Dietitian", category: "Nursing" },
	{ email: "pharmacist@qhealth.local", label: "Pharmacist", category: "Pharmacy" },
	{ email: "labtech@qhealth.local", label: "Lab Tech", category: "Diagnostics" },
	{ email: "radiologist@qhealth.local", label: "Radiologist", category: "Diagnostics" },
	{ email: "bloodbank@qhealth.local", label: "Blood Bank", category: "Diagnostics" },
	{ email: "billing@qhealth.local", label: "Billing Officer", category: "Billing" },
	{ email: "msw@qhealth.local", label: "Social Worker", category: "Billing" },
	{ email: "him@qhealth.local", label: "HIM Coder", category: "Records" },
	{ email: "surveillance@qhealth.local", label: "Surveillance", category: "Records" },
	{ email: "auditor@qhealth.local", label: "Auditor", category: "Records" },
] as const

const CATEGORY_ORDER = ["Admin", "ADT", "Emergency", "Clinical", "Nursing", "Pharmacy", "Diagnostics", "Billing", "Records"]

const CATEGORY_COLORS: Record<string, string> = {
	Admin: "bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-200",
	ADT: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-200",
	Emergency: "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-orange-200",
	Clinical: "bg-violet-500/10 text-violet-600 hover:bg-violet-500/20 border-violet-200",
	Nursing: "bg-pink-500/10 text-pink-600 hover:bg-pink-500/20 border-pink-200",
	Pharmacy: "bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-200",
	Diagnostics: "bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20 border-cyan-200",
	Billing: "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border-yellow-200",
	Records: "bg-slate-500/10 text-slate-600 hover:bg-slate-500/20 border-slate-200",
}

const PASSWORD = "Password123"

export function DevQuickLogin() {
	const [open, setOpen] = useState(false)
	const [loggingIn, setLoggingIn] = useState<string | null>(null)
	const { mutateAsync: login } = useLoginMutation()

	if (process.env.NODE_ENV === "production") return null

	const grouped = CATEGORY_ORDER.map(cat => ({
		category: cat,
		accounts: DEV_ACCOUNTS.filter(a => a.category === cat),
	}))

	async function handleQuickLogin(email: string) {
		setLoggingIn(email)
		try {
			// Sign out first so Better Auth doesn't return the existing active session
			await authClient.signOut()
			await login({ email, password: PASSWORD })
		} catch {
			setLoggingIn(null)
		}
	}

	return (
		<Card className="border-dashed border-amber-300 bg-amber-50/50 dark:border-amber-700/50 dark:bg-amber-950/20 overflow-hidden" aria-label="Development Quick Login">
			<CardHeader 
				className="cursor-pointer pb-2 pt-3 transition-colors hover:bg-amber-100/50 dark:hover:bg-amber-900/30" 
				onClick={() => setOpen(v => !v)}
			>
				<CardTitle className="flex items-center justify-between text-sm font-medium text-amber-700 dark:text-amber-400 font-sans">
					<span className="flex items-center gap-2">
						<Terminal className="size-4" />
						Dev Quick Login
					</span>
					<motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<path d="m6 9 6 6 6-6" />
						</svg>
					</motion.div>
				</CardTitle>
			</CardHeader>

			<AnimatePresence initial={false}>
				{open && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.3, ease: "easeInOut" }}
					>
						<CardContent className="space-y-4 pb-4 pt-0">
							<p className="text-muted-foreground text-xs font-sans">
								All accounts use <code className="bg-muted rounded px-1.5 py-0.5 text-[11px]">Password123</code>
							</p>
							
							<div className="space-y-3">
								{grouped.map(({ category, accounts }, idx) => (
									<motion.div 
										key={category}
										initial={{ opacity: 0, x: -10 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ delay: 0.1 + (idx * 0.05) }}
									>
										<p className="text-muted-foreground mb-1.5 text-[10px] font-medium uppercase tracking-wider font-sans">
											{category}
										</p>
										<div className="flex flex-wrap gap-1.5">
											{accounts.map(account => (
												<Button
													key={account.email}
													variant="outline"
													size="sm"
													disabled={loggingIn !== null}
													onClick={() => handleQuickLogin(account.email)}
													className={cn(
														"h-7 cursor-pointer border px-2.5 text-xs transition-colors font-sans",
														CATEGORY_COLORS[category]
													)}
												>
													{loggingIn === account.email ? (
														<motion.span
															initial={{ opacity: 0 }}
															animate={{ opacity: 1 }}
															transition={{ repeat: Infinity, duration: 0.8, direction: "alternate" }}
														>
															...
														</motion.span>
													) : (
														account.label
													)}
												</Button>
											))}
										</div>
									</motion.div>
								))}
							</div>
						</CardContent>
					</motion.div>
				)}
			</AnimatePresence>
		</Card>
	)
}
