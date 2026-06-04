"use client"

import { useEffect, useState } from "react"
import { animate, AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion"

export function WorkflowSection() {
	const flows = [
		{
			id: "opd",
			name: "OPD Consultation",
			steps: [
				{ name: "Registration", role: "Registrar", time: "5m" },
				{ name: "Vital Signs", role: "Nurse", time: "10m" },
				{ name: "Consultation", role: "Clinician", time: "20m" },
				{ name: "Disposition", role: "Clinician", time: "5m" },
			],
		},
		{
			id: "ed",
			name: "ED Routing",
			steps: [
				{ name: "OECB Triage", role: "Triage Officer", time: "3m" },
				{ name: "Initial Assessment", role: "ED Resident", time: "10m" },
				{ name: "Stat Orders", role: "ED Resident", time: "15m" },
				{ name: "Disposition", role: "Attending", time: "30m" },
			],
		},
		{
			id: "ancillary",
			name: "Ancillary Services",
			steps: [
				{ name: "Order Receipt", role: "Technologist", time: "2m" },
				{ name: "Specimen Collection", role: "Phlebotomist", time: "10m" },
				{ name: "Processing", role: "Technologist", time: "45m" },
				{ name: "Validation", role: "Pathologist", time: "15m" },
			],
		},
		{
			id: "admission",
			name: "Inpatient Admission",
			steps: [
				{ name: "Admission Order", role: "Clinician", time: "5m" },
				{ name: "Bed Assignment", role: "Admitting", time: "15m" },
				{ name: "Financial Clearance", role: "Social Worker", time: "20m" },
				{ name: "Unit Transfer", role: "Nurse", time: "15m" },
			],
		},
		{
			id: "discharge",
			name: "Discharge & Billing",
			steps: [
				{ name: "Discharge Order", role: "Clinician", time: "10m" },
				{ name: "CF4 Finalization", role: "Clinician", time: "15m" },
				{ name: "eSOA Generation", role: "Biller", time: "20m" },
				{ name: "Clearance", role: "Discharge Nurse", time: "10m" },
			],
		},
		{
			id: "pharmacy",
			name: "Outpatient Pharmacy",
			steps: [
				{ name: "Rx Receipt", role: "Pharmacist", time: "2m" },
				{ name: "Clinical Review", role: "Pharmacist", time: "5m" },
				{ name: "Dispensing", role: "Pharmacy Tech", time: "10m" },
				{ name: "Counseling", role: "Pharmacist", time: "5m" },
			],
		},
		{
			id: "records",
			name: "Medical Records",
			steps: [
				{ name: "Request Receipt", role: "HIM Clerk", time: "5m" },
				{ name: "Chart Retrieval", role: "HIM Clerk", time: "15m" },
				{ name: "Abstraction", role: "Coder", time: "30m" },
				{ name: "Release", role: "HIM Officer", time: "10m" },
			],
		},
	]

	const [activeFlow, setActiveFlow] = useState(flows[0]!)

	return (
		<section id="workflows" className="bg-background py-24">
			<div className="container mx-auto max-w-7xl px-6">
				<div className="mb-16">
					<motion.h2
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						className="text-foreground mb-6 font-serif text-3xl font-medium tracking-tight md:text-4xl lg:text-5xl"
					>
						Seven Patient Flows. One Compliant System.
					</motion.h2>
					<motion.p
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ delay: 0.1 }}
						className="text-muted-foreground max-w-3xl font-sans text-lg"
					>
						Every status change timestamped. Every Citizen&apos;s Charter SLA measurable. Every
						workflow auditable.
					</motion.p>
				</div>

				<div className="grid gap-12 lg:grid-cols-12">
					{/* Sidebar Selector */}
					<div className="flex flex-col gap-2 lg:col-span-4">
						{flows.map(flow => (
							<button
								key={flow.id}
								onClick={() => setActiveFlow(flow)}
								className={`rounded-lg px-6 py-4 text-left font-medium transition-all duration-300 ${
									activeFlow.id === flow.id
										? "bg-primary text-primary-foreground shadow-md"
										: "bg-card text-foreground hover:bg-muted border-border border"
								}`}
							>
								{flow.name}
							</button>
						))}
					</div>

					{/* Flow Visualizer */}
					<div className="bg-card border-border relative overflow-hidden rounded-xl border p-8 lg:col-span-8">
						<div className="absolute top-0 right-0 p-8 opacity-5">
							<svg width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor">
								<circle cx="12" cy="12" r="10" strokeWidth="1" />
								<polyline points="12 6 12 12 16 14" strokeWidth="1" />
							</svg>
						</div>

						<h3 className="text-foreground mb-12 font-serif text-2xl font-semibold">
							{activeFlow.name} SLA Tracking
						</h3>

						<AnimatePresence mode="wait">
							<motion.div
								key={activeFlow.id}
								initial={{ opacity: 0, x: 20 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: -20 }}
								transition={{ duration: 0.3 }}
								className="relative"
							>
								{/* Connecting Line */}
								<div className="bg-border absolute top-6 right-6 left-6 z-0 h-[2px]" />
								<motion.div
									className="bg-primary absolute top-6 left-6 z-0 h-[2px] origin-left"
									initial={{ scaleX: 0 }}
									animate={{ scaleX: 1 }}
									transition={{ duration: 0.8, delay: 0.2 }}
								/>

								<div className="relative z-10 grid grid-cols-4 gap-4">
									{activeFlow.steps.map((step, idx) => (
										<motion.div
											key={idx}
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ delay: 0.3 + idx * 0.15 }}
											className="flex flex-col items-center text-center"
										>
											<div className="bg-background border-primary text-primary mb-4 flex h-12 w-12 items-center justify-center rounded-full border-2 font-bold shadow-sm">
												{idx + 1}
											</div>
											<h4 className="text-foreground mb-2 text-sm font-semibold">{step.name}</h4>
											<div className="flex flex-col items-center gap-1">
												<span className="bg-secondary text-secondary-foreground rounded px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase">
													{step.role}
												</span>
												<span className="text-muted-foreground text-xs font-medium">
													Target: {step.time}
												</span>
											</div>
										</motion.div>
									))}
								</div>
							</motion.div>
						</AnimatePresence>

						<div className="border-border mt-16 flex flex-col items-center justify-between gap-6 border-t pt-8 sm:flex-row">
							<div className="text-muted-foreground flex items-center gap-4 text-sm">
								<svg
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									className="text-primary stroke-current"
								>
									<circle cx="12" cy="12" r="10" strokeWidth="1.5" />
									<path
										d="M12 6v6l4 2"
										strokeWidth="1.5"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
								<span>Total ARTA SLA tracking engaged for this flow.</span>
							</div>
							<div className="bg-success/10 text-success border-success/20 rounded-md border px-4 py-2 text-sm font-medium">
								ARTA Compliant
							</div>
						</div>
					</div>
				</div>

				<StatsRow />
			</div>
		</section>
	)
}

function StatsRow() {
	return (
		<div className="border-border mt-24 grid grid-cols-2 gap-8 border-t pt-12 md:grid-cols-4">
			<StatItem value={7} suffix="" label="Patient Flows" />
			<StatItem value={30} suffix="+" label="Workflow Steps" />
			<StatItem value={100} suffix="%" label="SLA Tracked" />
			<div className="flex flex-col">
				<span className="text-foreground mb-2 font-serif text-4xl font-semibold">Real-time</span>
				<span className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
					Turnaround Reports
				</span>
			</div>
		</div>
	)
}

function StatItem({ value, suffix, label }: { value: number; suffix: string; label: string }) {
	const count = useMotionValue(0)
	const rounded = useTransform(count, Math.round)
	const [hasAnimated, setHasAnimated] = useState(false)

	useEffect(() => {
		if (!hasAnimated) return
		const controls = animate(count, value, { duration: 2, ease: "easeOut" })
		return controls.stop
	}, [hasAnimated, count, value])

	return (
		<motion.div
			className="flex flex-col"
			onViewportEnter={() => setHasAnimated(true)}
			viewport={{ once: true }}
		>
			<div className="text-foreground mb-2 flex items-baseline font-serif text-4xl font-semibold lg:text-5xl">
				<motion.span>{rounded}</motion.span>
				<span>{suffix}</span>
			</div>
			<span className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
				{label}
			</span>
		</motion.div>
	)
}
