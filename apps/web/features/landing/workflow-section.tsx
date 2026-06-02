"use client"

import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion"
import { useState, useEffect } from "react"

export function WorkflowSection() {
	const flows = [
		{
			id: "opd",
			name: "OPD Consultation",
			steps: [
				{ name: "Registration", role: "Registrar", time: "5m" },
				{ name: "Vital Signs", role: "Nurse", time: "10m" },
				{ name: "Consultation", role: "Clinician", time: "20m" },
				{ name: "Disposition", role: "Clinician", time: "5m" }
			]
		},
		{
			id: "ed",
			name: "ED Routing",
			steps: [
				{ name: "OECB Triage", role: "Triage Officer", time: "3m" },
				{ name: "Initial Assessment", role: "ED Resident", time: "10m" },
				{ name: "Stat Orders", role: "ED Resident", time: "15m" },
				{ name: "Disposition", role: "Attending", time: "30m" }
			]
		},
		{
			id: "ancillary",
			name: "Ancillary Services",
			steps: [
				{ name: "Order Receipt", role: "Technologist", time: "2m" },
				{ name: "Specimen Collection", role: "Phlebotomist", time: "10m" },
				{ name: "Processing", role: "Technologist", time: "45m" },
				{ name: "Validation", role: "Pathologist", time: "15m" }
			]
		},
		{
			id: "admission",
			name: "Inpatient Admission",
			steps: [
				{ name: "Admission Order", role: "Clinician", time: "5m" },
				{ name: "Bed Assignment", role: "Admitting", time: "15m" },
				{ name: "Financial Clearance", role: "Social Worker", time: "20m" },
				{ name: "Unit Transfer", role: "Nurse", time: "15m" }
			]
		},
		{
			id: "discharge",
			name: "Discharge & Billing",
			steps: [
				{ name: "Discharge Order", role: "Clinician", time: "10m" },
				{ name: "CF4 Finalization", role: "Clinician", time: "15m" },
				{ name: "eSOA Generation", role: "Biller", time: "20m" },
				{ name: "Clearance", role: "Discharge Nurse", time: "10m" }
			]
		},
		{
			id: "pharmacy",
			name: "Outpatient Pharmacy",
			steps: [
				{ name: "Rx Receipt", role: "Pharmacist", time: "2m" },
				{ name: "Clinical Review", role: "Pharmacist", time: "5m" },
				{ name: "Dispensing", role: "Pharmacy Tech", time: "10m" },
				{ name: "Counseling", role: "Pharmacist", time: "5m" }
			]
		},
		{
			id: "records",
			name: "Medical Records",
			steps: [
				{ name: "Request Receipt", role: "HIM Clerk", time: "5m" },
				{ name: "Chart Retrieval", role: "HIM Clerk", time: "15m" },
				{ name: "Abstraction", role: "Coder", time: "30m" },
				{ name: "Release", role: "HIM Officer", time: "10m" }
			]
		}
	]

	const [activeFlow, setActiveFlow] = useState(flows[0]!)

	return (
		<section id="workflows" className="py-24 bg-background">
			<div className="container mx-auto px-6 max-w-7xl">
				<div className="mb-16">
					<motion.h2 
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						className="font-serif text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight text-foreground mb-6"
					>
						Seven Patient Flows. One Compliant System.
					</motion.h2>
					<motion.p 
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ delay: 0.1 }}
						className="text-lg text-muted-foreground font-sans max-w-3xl"
					>
						Every status change timestamped. Every Citizen&apos;s Charter SLA measurable. Every workflow auditable.
					</motion.p>
				</div>

				<div className="grid lg:grid-cols-12 gap-12">
					{/* Sidebar Selector */}
					<div className="lg:col-span-4 flex flex-col gap-2">
						{flows.map((flow) => (
							<button
								key={flow.id}
								onClick={() => setActiveFlow(flow)}
								className={`text-left px-6 py-4 rounded-lg transition-all duration-300 font-medium ${
									activeFlow.id === flow.id 
										? "bg-primary text-primary-foreground shadow-md" 
										: "bg-card text-foreground hover:bg-muted border border-border"
								}`}
							>
								{flow.name}
							</button>
						))}
					</div>

					{/* Flow Visualizer */}
					<div className="lg:col-span-8 bg-card border border-border rounded-xl p-8 relative overflow-hidden">
						<div className="absolute top-0 right-0 p-8 opacity-5">
							<svg width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor">
								<circle cx="12" cy="12" r="10" strokeWidth="1" />
								<polyline points="12 6 12 12 16 14" strokeWidth="1" />
							</svg>
						</div>

						<h3 className="font-serif text-2xl font-semibold mb-12 text-foreground">{activeFlow.name} SLA Tracking</h3>
						
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
								<div className="absolute top-6 left-6 right-6 h-[2px] bg-border z-0" />
								<motion.div 
									className="absolute top-6 left-6 h-[2px] bg-primary z-0 origin-left"
									initial={{ scaleX: 0 }}
									animate={{ scaleX: 1 }}
									transition={{ duration: 0.8, delay: 0.2 }}
								/>

								<div className="grid grid-cols-4 gap-4 relative z-10">
									{activeFlow.steps.map((step, idx) => (
										<motion.div 
											key={idx}
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ delay: 0.3 + idx * 0.15 }}
											className="flex flex-col items-center text-center"
										>
											<div className="w-12 h-12 rounded-full bg-background border-2 border-primary flex items-center justify-center mb-4 text-primary font-bold shadow-sm">
												{idx + 1}
											</div>
											<h4 className="font-semibold text-foreground mb-2 text-sm">{step.name}</h4>
											<div className="flex flex-col items-center gap-1">
												<span className="text-[10px] uppercase tracking-wider font-mono bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
													{step.role}
												</span>
												<span className="text-xs font-medium text-muted-foreground">
													Target: {step.time}
												</span>
											</div>
										</motion.div>
									))}
								</div>
							</motion.div>
						</AnimatePresence>

						<div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-6">
							<div className="flex items-center gap-4 text-sm text-muted-foreground">
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-primary stroke-current">
									<circle cx="12" cy="12" r="10" strokeWidth="1.5" />
									<path d="M12 6v6l4 2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
								<span>Total ARTA SLA tracking engaged for this flow.</span>
							</div>
							<div className="px-4 py-2 bg-success/10 text-success rounded-md text-sm font-medium border border-success/20">
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
		<div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-24 border-t border-border pt-12">
			<StatItem value={7} suffix="" label="Patient Flows" />
			<StatItem value={30} suffix="+" label="Workflow Steps" />
			<StatItem value={100} suffix="%" label="SLA Tracked" />
			<div className="flex flex-col">
				<span className="font-serif text-4xl font-semibold text-foreground mb-2">Real-time</span>
				<span className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Turnaround Reports</span>
			</div>
		</div>
	)
}

function StatItem({ value, suffix, label }: { value: number, suffix: string, label: string }) {
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
			<div className="font-serif text-4xl lg:text-5xl font-semibold text-foreground mb-2 flex items-baseline">
				<motion.span>{rounded}</motion.span>
				<span>{suffix}</span>
			</div>
			<span className="text-sm text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
		</motion.div>
	)
}
