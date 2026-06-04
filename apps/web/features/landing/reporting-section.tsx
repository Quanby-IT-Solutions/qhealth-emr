"use client"

import { useRef, useState } from "react"
import { motion, useInView } from "framer-motion"

export function ReportingSection() {
	const ref = useRef(null)
	const isInView = useInView(ref, { once: true, amount: 0.3 })

	const capabilities = [
		{
			id: "ahsr",
			title: "AHSR Automation",
			desc: "Automated Annual Hospital Statistical Report generation for DOH LTO renewal. Calculates BOR, mortality rates, and ICD-10 mapped top 10 morbidity.",
			detail:
				"Extracts daily census data, final diagnoses, and discharge dispositions to automatically populate DOH-mandated reporting formats.",
			diagram: (
				<svg
					width="100%"
					height="120"
					viewBox="0 0 300 120"
					fill="none"
					className="text-primary stroke-current"
				>
					<rect x="20" y="20" width="60" height="80" rx="4" strokeWidth="1.5" />
					<rect x="30" y="35" width="40" height="4" rx="2" strokeWidth="1.5" />
					<rect x="30" y="50" width="30" height="4" rx="2" strokeWidth="1.5" />

					<motion.path
						d="M80 60 H 130"
						strokeWidth="1.5"
						strokeDasharray="4 4"
						initial={{ pathLength: 0 }}
						animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
						transition={{ duration: 1, delay: 0.5 }}
					/>

					<circle cx="150" cy="60" r="20" strokeWidth="1.5" />
					<path
						d="M142 60 L148 66 L158 54"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>

					<motion.path
						d="M170 60 H 220"
						strokeWidth="1.5"
						strokeDasharray="4 4"
						initial={{ pathLength: 0 }}
						animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
						transition={{ duration: 1, delay: 1 }}
					/>

					<rect x="220" y="30" width="60" height="60" rx="4" strokeWidth="1.5" />
					<path d="M235 50 H265M235 60 H265M235 70 H255" strokeWidth="1.5" strokeLinecap="round" />
				</svg>
			),
		},
		{
			id: "pidsr",
			title: "PIDSR Integration",
			desc: "Real-time syndromic keyword detection and ICD-10-based Category 1/2 notifiable disease flagging.",
			detail:
				"Scans triage notes, laboratory results, and final diagnoses against DOH Epidemiology Bureau criteria to trigger automated surveillance alerts.",
			diagram: (
				<svg
					width="100%"
					height="120"
					viewBox="0 0 300 120"
					fill="none"
					className="text-primary stroke-current"
				>
					<circle cx="50" cy="60" r="30" strokeWidth="1.5" strokeDasharray="4 4" />
					<path d="M40 60 H60 M50 50 V70" strokeWidth="1.5" strokeLinecap="round" />

					<motion.path
						d="M80 60 Q 115 20 150 60 T 220 60"
						strokeWidth="1.5"
						fill="none"
						initial={{ pathLength: 0 }}
						animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
						transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
					/>

					<circle cx="150" cy="60" r="6" fill="currentColor" />
					<motion.circle
						cx="150"
						cy="60"
						r="15"
						strokeWidth="1"
						initial={{ scale: 0.5, opacity: 1 }}
						animate={isInView ? { scale: 2, opacity: 0 } : {}}
						transition={{ repeat: Infinity, duration: 2 }}
					/>

					<path
						d="M230 40 L260 40 L270 60 L260 80 L230 80 Z"
						strokeWidth="1.5"
						strokeLinejoin="round"
					/>
					<circle cx="250" cy="60" r="3" fill="currentColor" />
				</svg>
			),
		},
		{
			id: "claims",
			title: "PhilHealth eClaims",
			desc: "CF4 extraction from finalized clinical notes, CF5 DRG shadow billing, and integrated eSOA and CEWS eligibility.",
			detail:
				"Maps local procedures to RVS codes and diagnoses to ICD-10, automatically structuring the XML payload required by PhilHealth's IHCP portal.",
			diagram: (
				<svg
					width="100%"
					height="120"
					viewBox="0 0 300 120"
					fill="none"
					className="text-primary stroke-current"
				>
					<rect x="20" y="30" width="50" height="60" rx="4" strokeWidth="1.5" />
					<path
						d="M30 45 H60 M30 55 H50 M30 65 H60 M30 75 H45"
						strokeWidth="1.5"
						strokeLinecap="round"
					/>

					<motion.path
						d="M70 60 H 130"
						strokeWidth="1.5"
						initial={{ strokeDashoffset: 60, strokeDasharray: "4 4" }}
						animate={isInView ? { strokeDashoffset: 0 } : { strokeDashoffset: 60 }}
						transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
					/>

					<polygon points="150,30 180,60 150,90 120,60" strokeWidth="1.5" strokeLinejoin="round" />
					<path d="M140 60 H160 M150 50 V70" strokeWidth="1.5" strokeLinecap="round" />

					<motion.path
						d="M180 60 H 220"
						strokeWidth="1.5"
						initial={{ strokeDashoffset: 40, strokeDasharray: "4 4" }}
						animate={isInView ? { strokeDashoffset: 0 } : { strokeDashoffset: 40 }}
						transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
					/>

					<path d="M230 40 H270 V80 H230 Z" strokeWidth="1.5" strokeLinejoin="round" />
					<path
						d="M240 55 L245 60 L260 45"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
					<path d="M240 70 H260" strokeWidth="1.5" strokeLinecap="round" />
				</svg>
			),
		},
	]

	return (
		<section className="bg-secondary border-border border-y py-32" ref={ref}>
			<div className="container mx-auto max-w-7xl px-6">
				<div className="mx-auto mb-20 max-w-4xl text-center">
					<motion.h2
						className="text-foreground mb-6 font-serif text-4xl font-medium tracking-tight md:text-5xl lg:text-6xl"
						initial={{ opacity: 0, y: 20 }}
						animate={isInView ? { opacity: 1, y: 0 } : {}}
						transition={{ duration: 0.6 }}
					>
						The Statutory Reporting Engine
					</motion.h2>
					<motion.p
						className="text-muted-foreground font-sans text-xl"
						initial={{ opacity: 0, y: 20 }}
						animate={isInView ? { opacity: 1, y: 0 } : {}}
						transition={{ duration: 0.6, delay: 0.1 }}
					>
						Automated AHSR, PIDSR, and PhilHealth claims generation — eliminating manual abstraction
						and ensuring compliance by default.
					</motion.p>
				</div>

				<div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:gap-12">
					{capabilities.map((cap, idx) => (
						<CapabilityCard key={cap.id} cap={cap} idx={idx} isInView={isInView} />
					))}
				</div>
			</div>
		</section>
	)
}

function CapabilityCard({ cap, idx, isInView }: { cap: any; idx: number; isInView: boolean }) {
	const [expanded, setExpanded] = useState(false)

	return (
		<motion.div
			className="bg-background border-border flex flex-col rounded-xl border p-8 shadow-sm"
			initial={{ opacity: 0, y: 30 }}
			animate={isInView ? { opacity: 1, y: 0 } : {}}
			transition={{ duration: 0.6, delay: 0.2 + idx * 0.1 }}
		>
			<div className="bg-secondary/50 border-border/50 mb-8 flex w-full items-center justify-center overflow-hidden rounded-lg border p-4">
				{cap.diagram}
			</div>

			<h3 className="text-foreground mb-4 font-serif text-2xl font-semibold">{cap.title}</h3>
			<p className="text-muted-foreground mb-6 flex-grow leading-relaxed">{cap.desc}</p>

			<div className="border-border mt-auto border-t pt-4">
				<button
					onClick={() => setExpanded(!expanded)}
					className="text-primary hover:text-primary/80 flex w-full items-center justify-between text-sm font-medium transition-colors"
				>
					<span>How it works</span>
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
					>
						<polyline points="6 9 12 15 18 9"></polyline>
					</svg>
				</button>

				<motion.div
					initial={false}
					animate={{
						height: expanded ? "auto" : 0,
						opacity: expanded ? 1 : 0,
						marginTop: expanded ? 12 : 0,
					}}
					className="overflow-hidden"
				>
					<p className="text-muted-foreground bg-secondary/50 border-border/50 rounded-md border p-4 text-sm">
						{cap.detail}
					</p>
				</motion.div>
			</div>
		</motion.div>
	)
}
