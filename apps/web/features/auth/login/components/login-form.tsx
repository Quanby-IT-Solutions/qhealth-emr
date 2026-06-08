"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useForm } from "@tanstack/react-form"
import { AnimatePresence, motion, type Variants } from "framer-motion"

import { buttonVariants } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/core/components/ui/field"
import { Input } from "@/core/components/ui/input"
import { cn } from "@/core/lib/utils"
import { PasswordInput } from "@/features/auth/components/password-input"
import { TermsPrivacyNote } from "@/features/auth/components/terms-privacy-note"

import { useLoginMutation } from "../api/login.hooks"
import { LoginSchema } from "../api/login.schema"

const TRUST_STATEMENTS = [
	{
		text: "DOH AHSR Compliant. NHDR-Ready.",
		icon: (
			<svg
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				className="text-primary"
			>
				<path
					d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		),
	},
	{
		text: "PhilHealth eClaims Automated.",
		icon: (
			<svg
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				className="text-primary"
			>
				<path
					d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				<path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		),
	},
	{
		text: "Data Privacy Act 2012 Compliant.",
		icon: (
			<svg
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				className="text-primary"
			>
				<rect
					x="3"
					y="11"
					width="18"
					height="11"
					rx="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				<path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		),
	},
	{
		text: "ARTA Citizen's Charter SLA Tracking.",
		icon: (
			<svg
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				className="text-primary"
			>
				<circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
				<path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		),
	},
]

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
	const { mutateAsync: login, isPending, isError, error } = useLoginMutation()
	const [activeStatement, setActiveStatement] = useState(0)
	const [shake, setShake] = useState(false)

	useEffect(() => {
		const interval = setInterval(() => {
			setActiveStatement(prev => (prev + 1) % TRUST_STATEMENTS.length)
		}, 5000)
		return () => clearInterval(interval)
	}, [])

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		validators: {
			onSubmit: LoginSchema,
		},
		onSubmit: async ({ value }) => {
			try {
				await login(value)
			} catch {
				setShake(true)
				setTimeout(() => setShake(false), 400)
			}
		},
	})

	const containerVariants: Variants = {
		hidden: { opacity: 0 },
		show: {
			opacity: 1,
			transition: { staggerChildren: 0.07 },
		},
	}

	const itemVariants: Variants = {
		hidden: { opacity: 0, y: 12 },
		show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 20 } },
	}

	const activeTrustStatement = TRUST_STATEMENTS[activeStatement] ?? TRUST_STATEMENTS[0]!

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<motion.div animate={shake ? { x: [0, -6, 6, -3, 3, 0] } : {}} transition={{ duration: 0.4 }}>
				<Card className="border-border bg-card overflow-hidden p-0 shadow-lg">
					<CardContent className="grid min-h-[600px] p-0 md:grid-cols-2">
						{/* Left Panel: Form */}
						<form
							className="flex flex-col justify-center p-6 md:p-10"
							onSubmit={e => {
								e.preventDefault()
								form.handleSubmit()
							}}
						>
							<motion.div
								variants={containerVariants}
								initial="hidden"
								animate="show"
								className="flex flex-col gap-6"
							>
								<motion.div
									variants={itemVariants}
									className="flex flex-col items-center gap-2 text-center"
								>
									<h1 className="text-foreground font-serif text-3xl font-bold tracking-tight">
										Welcome back
									</h1>
									<p className="text-muted-foreground font-sans text-balance">
										Sign in to access your Peregrine workspace
									</p>
								</motion.div>

								<AnimatePresence>
									{isError && (
										<motion.div
											initial={{ opacity: 0, y: -10, height: 0 }}
											animate={{ opacity: 1, y: 0, height: "auto" }}
											exit={{ opacity: 0, y: -10, height: 0 }}
											className="overflow-hidden"
										>
											<div className="bg-destructive/10 border-destructive/20 text-destructive dark:bg-destructive/20 flex items-center gap-2 rounded-md border p-3 text-sm">
												<svg
													width="16"
													height="16"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
													className="shrink-0"
												>
													<path
														d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
														strokeLinecap="round"
														strokeLinejoin="round"
													/>
													<line
														x1="12"
														y1="9"
														x2="12"
														y2="13"
														strokeLinecap="round"
														strokeLinejoin="round"
													/>
													<line
														x1="12"
														y1="17"
														x2="12.01"
														y2="17"
														strokeLinecap="round"
														strokeLinejoin="round"
													/>
												</svg>
												{error instanceof Error ? error.message : "An unexpected error occurred"}
											</div>
										</motion.div>
									)}
								</AnimatePresence>

								<FieldGroup className="gap-5">
									<form.Field
										name="email"
										children={field => {
											const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
											return (
												<motion.div variants={itemVariants}>
													<Field data-invalid={isInvalid} className="group relative">
														<FieldLabel htmlFor={field.name} className="font-sans">
															Email
														</FieldLabel>
														<div className="relative">
															<div className="text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 -translate-y-1/2 transition-colors">
																<svg
																	width="16"
																	height="16"
																	viewBox="0 0 24 24"
																	fill="none"
																	stroke="currentColor"
																	strokeWidth="1.5"
																	strokeLinecap="round"
																	strokeLinejoin="round"
																>
																	<rect x="2" y="4" width="20" height="16" rx="2" />
																	<path d="m2 4 10 8 10-8" />
																</svg>
															</div>
															<Input
																id={field.name}
																name={field.name}
																type="email"
																value={field.state.value}
																onBlur={field.handleBlur}
																onChange={e => field.handleChange(e.target.value)}
																aria-invalid={isInvalid}
																placeholder="m@example.com"
																autoComplete="email"
																required
																disabled={isPending}
																className="focus-visible:ring-ring focus-visible:border-ring pl-9 shadow-sm transition-all focus-visible:ring-1"
															/>
														</div>
														<AnimatePresence>
															{isInvalid && (
																<motion.div
																	initial={{ opacity: 0, y: -5 }}
																	animate={{ opacity: 1, y: 0 }}
																	exit={{ opacity: 0, y: -5 }}
																>
																	<FieldError errors={field.state.meta.errors} />
																</motion.div>
															)}
														</AnimatePresence>
													</Field>
												</motion.div>
											)
										}}
									/>

									<form.Field
										name="password"
										children={field => {
											const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
											return (
												<motion.div variants={itemVariants}>
													<Field data-invalid={isInvalid} className="group relative">
														<div className="flex items-center">
															<FieldLabel htmlFor={field.name} className="font-sans">
																Password
															</FieldLabel>
															<Link
																href="#"
																className={cn(
																	buttonVariants({ size: "sm", variant: "link" }),
																	"text-muted-foreground hover:text-primary ml-auto h-auto px-0 font-sans transition-colors"
																)}
															>
																Forgot your password?
															</Link>
														</div>
														<PasswordInput
															id={field.name}
															name={field.name}
															value={field.state.value}
															onBlur={field.handleBlur}
															onChange={e => field.handleChange(e.target.value)}
															aria-invalid={isInvalid}
															required
															autoComplete="current-password"
															disabled={isPending}
														/>
														<AnimatePresence>
															{isInvalid && (
																<motion.div
																	initial={{ opacity: 0, y: -5 }}
																	animate={{ opacity: 1, y: 0 }}
																	exit={{ opacity: 0, y: -5 }}
																>
																	<FieldError errors={field.state.meta.errors} />
																</motion.div>
															)}
														</AnimatePresence>
													</Field>
												</motion.div>
											)
										}}
									/>

									<motion.div variants={itemVariants}>
										<Field>
											<motion.button
												type="submit"
												disabled={isPending}
												whileHover={
													isPending
														? {}
														: {
																scale: 1.015,
																y: -1,
																boxShadow: "0 4px 14px 0 rgba(var(--primary), 0.2)",
															}
												}
												whileTap={isPending ? {} : { scale: 0.98 }}
												className={cn(
													"bg-primary text-primary-foreground focus-visible:ring-ring flex h-10 w-full items-center justify-center rounded-md font-sans font-medium shadow-sm transition-all focus-visible:ring-1 focus-visible:outline-none",
													isPending
														? "cursor-not-allowed opacity-70"
														: "hover:bg-primary/90 cursor-pointer"
												)}
											>
												<AnimatePresence mode="wait">
													{isPending ? (
														<motion.span
															key="loading"
															initial={{ opacity: 0 }}
															animate={{ opacity: 1 }}
															exit={{ opacity: 0 }}
															className="flex items-center gap-2"
														>
															<motion.svg
																animate={{ rotate: 360 }}
																transition={{ repeat: Infinity, ease: "linear", duration: 1 }}
																width="16"
																height="16"
																viewBox="0 0 24 24"
																fill="none"
																stroke="currentColor"
																strokeWidth="2"
																strokeLinecap="round"
																className="opacity-70"
															>
																<path d="M21 12a9 9 0 1 1-6.219-8.56" />
															</motion.svg>
															Signing in...
														</motion.span>
													) : (
														<motion.span
															key="idle"
															initial={{ opacity: 0 }}
															animate={{ opacity: 1 }}
															exit={{ opacity: 0 }}
														>
															Login
														</motion.span>
													)}
												</AnimatePresence>
											</motion.button>
										</Field>
									</motion.div>
								</FieldGroup>
							</motion.div>
						</form>

						{/* Right Panel: Editorial Visual */}
						<div className="bg-muted border-border/50 relative hidden flex-col items-center justify-between overflow-hidden border-l p-10 md:flex">
							{/* Abstract Philippine Map/Data Visualization Background */}
							<motion.div
								className="text-primary absolute inset-0 opacity-10 dark:opacity-[0.15]"
								animate={{
									x: [0, -10, 0],
									y: [0, 5, 0],
								}}
								transition={{
									repeat: Infinity,
									duration: 25,
									ease: "linear",
								}}
							>
								{/* Stylized Architectural/Workflow SVG Grid */}
								<svg
									width="100%"
									height="100%"
									viewBox="0 0 400 600"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M50 100 L350 100 M50 150 L350 150 M50 200 L350 200 M50 250 L200 250 M50 300 L250 300 M50 350 L350 350"
										stroke="currentColor"
										strokeWidth="1"
										strokeDasharray="4 4"
									/>
									<circle cx="100" cy="150" r="4" fill="currentColor" />
									<circle cx="200" cy="200" r="4" fill="currentColor" />
									<circle cx="300" cy="100" r="4" fill="currentColor" />
									<rect
										x="80"
										y="400"
										width="40"
										height="100"
										stroke="currentColor"
										strokeWidth="1"
									/>
									<rect
										x="140"
										y="350"
										width="40"
										height="150"
										stroke="currentColor"
										strokeWidth="1"
									/>
									<rect
										x="200"
										y="450"
										width="40"
										height="50"
										stroke="currentColor"
										strokeWidth="1"
									/>
									<rect
										x="260"
										y="300"
										width="40"
										height="200"
										stroke="currentColor"
										strokeWidth="1"
									/>
									<path
										d="M50 550 C 150 450, 250 550, 350 450"
										stroke="currentColor"
										strokeWidth="1.5"
									/>
								</svg>
							</motion.div>

							{/* Identity Line */}
							<div className="relative z-10 mt-4 w-full text-center">
								<span className="text-muted-foreground font-mono text-xs font-medium tracking-widest uppercase">
									Peregrine
								</span>
							</div>

							{/* Rotating Trust Statements */}
							<div className="relative z-10 flex min-h-[140px] w-full max-w-[280px] flex-col items-center justify-center text-center">
								<AnimatePresence mode="wait">
									<motion.div
										key={activeStatement}
										initial={{ opacity: 0, y: 15 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -15 }}
										transition={{ duration: 0.5, ease: "easeOut" }}
										className="flex flex-col items-center gap-4"
									>
										<div className="bg-background border-border flex h-12 w-12 items-center justify-center rounded-full border shadow-sm">
											{activeTrustStatement.icon}
										</div>
										<h2 className="text-foreground font-serif text-xl leading-snug font-medium text-balance">
											{activeTrustStatement.text}
										</h2>
									</motion.div>
								</AnimatePresence>

								{/* Carousel Dots */}
								<div className="mt-8 flex gap-2">
									{TRUST_STATEMENTS.map((_, idx) => (
										<button
											key={idx}
											onClick={() => setActiveStatement(idx)}
											className={cn(
												"h-1.5 rounded-full transition-all duration-300",
												idx === activeStatement
													? "bg-primary w-4"
													: "bg-border hover:bg-muted-foreground/50 w-1.5"
											)}
											aria-label={`Go to slide ${idx + 1}`}
										/>
									))}
								</div>
							</div>

							{/* Footer */}
							<div className="relative z-10 mb-4 flex w-full items-center justify-center gap-2 text-center">
								<svg
									width="12"
									height="12"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									className="text-muted-foreground"
								>
									<path
										d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
									<line x1="12" y1="11" x2="12" y2="15" />
									<line x1="10" y1="13" x2="14" y2="13" />
								</svg>
								<span className="text-muted-foreground font-sans text-xs">
									Built for DOH-licensed hospitals
								</span>
							</div>
						</div>
					</CardContent>
				</Card>
			</motion.div>
			<TermsPrivacyNote />
		</div>
	)
}
