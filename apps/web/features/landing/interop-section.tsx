"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"

export function InteropSection() {
	const ref = useRef(null)
	const isInView = useInView(ref, { once: true, amount: 0.4 })

	const blocks = [
		{
			title: "HL7 FHIR R4",
			desc: "Built natively on the FHIR R4 data model. All resources (Patient, Observation, Condition, Encounter) comply with international interoperability standards."
		},
		{
			title: "NHDR Ready",
			desc: "Architected for seamless reporting to the Philippine National Health Data Repository (NHDR). Connects directly to DOH health information exchanges."
		},
		{
			title: "Terminology Enforcement",
			desc: "Hardcoded compliance to mandated reference sets: ICD-10/SNOMED CT for diagnoses, LOINC for labs, RxNorm for medications, and RVS for procedures."
		},
		{
			title: "External Integration",
			desc: "Clear API boundaries for bidirectional LIS (Laboratory) and PACS (Radiology) integration. Excludes ERP functions (supply chain, HR, payroll) to maintain clinical focus."
		}
	]

	return (
		<section id="interoperability" className="py-32 bg-card border-t border-border" ref={ref}>
			<div className="container mx-auto px-6 max-w-7xl">
				<div className="text-center max-w-3xl mx-auto mb-20">
					<motion.h2 
						initial={{ opacity: 0, y: 20 }}
						animate={isInView ? { opacity: 1, y: 0 } : {}}
						transition={{ duration: 0.6 }}
						className="font-serif text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight text-foreground mb-6"
					>
						The Interoperability Backbone
					</motion.h2>
					<motion.p 
						initial={{ opacity: 0, y: 20 }}
						animate={isInView ? { opacity: 1, y: 0 } : {}}
						transition={{ duration: 0.6, delay: 0.1 }}
						className="text-lg text-muted-foreground font-sans"
					>
						A system that speaks the language of modern healthcare. Ready for national integration today.
					</motion.p>
				</div>

				<div className="max-w-5xl mx-auto mb-24">
					<div className="relative w-full aspect-[2/1] md:aspect-[3/1] bg-background border border-border rounded-xl p-8 flex items-center justify-center overflow-hidden shadow-sm">
						<svg width="100%" height="100%" viewBox="0 0 800 300" fill="none" className="overflow-visible">
							{/* Connection Lines */}
							<motion.path 
								d="M 400 150 L 150 150" 
								stroke="var(--border)" strokeWidth="2" strokeDasharray="4 4"
								initial={{ pathLength: 0 }}
								animate={isInView ? { pathLength: 1 } : {}}
								transition={{ duration: 1.5, delay: 0.5 }}
							/>
							<motion.path 
								d="M 400 150 L 650 70" 
								stroke="var(--border)" strokeWidth="2"
								initial={{ pathLength: 0 }}
								animate={isInView ? { pathLength: 1 } : {}}
								transition={{ duration: 1, delay: 1 }}
							/>
							<motion.path 
								d="M 400 150 L 650 125" 
								stroke="var(--border)" strokeWidth="2"
								initial={{ pathLength: 0 }}
								animate={isInView ? { pathLength: 1 } : {}}
								transition={{ duration: 1, delay: 1.2 }}
							/>
							<motion.path 
								d="M 400 150 L 650 175" 
								stroke="var(--border)" strokeWidth="2"
								initial={{ pathLength: 0 }}
								animate={isInView ? { pathLength: 1 } : {}}
								transition={{ duration: 1, delay: 1.4 }}
							/>
							<motion.path 
								d="M 400 150 L 650 230" 
								stroke="var(--border)" strokeWidth="2"
								initial={{ pathLength: 0 }}
								animate={isInView ? { pathLength: 1 } : {}}
								transition={{ duration: 1, delay: 1.6 }}
							/>

							{/* NHDR Node */}
							<motion.g 
								initial={{ opacity: 0, scale: 0.8 }}
								animate={isInView ? { opacity: 1, scale: 1 } : {}}
								transition={{ duration: 0.5, delay: 0.2 }}
							>
								<circle cx="150" cy="150" r="40" fill="var(--card)" stroke="var(--primary)" strokeWidth="2" />
								<text x="150" y="145" textAnchor="middle" fill="var(--foreground)" className="font-serif font-bold text-lg">NHDR</text>
								<text x="150" y="165" textAnchor="middle" fill="var(--muted-foreground)" className="font-sans text-[10px] uppercase tracking-wider">Philippine</text>
							</motion.g>

							{/* HL7 Flow */}
							<motion.g
								initial={{ opacity: 0 }}
								animate={isInView ? { opacity: 1 } : {}}
								transition={{ duration: 0.5, delay: 1.5 }}
							>
								<rect x="235" y="135" width="80" height="30" rx="15" fill="var(--background)" stroke="var(--primary)" strokeWidth="1" />
								<text x="275" y="154" textAnchor="middle" fill="var(--primary)" className="font-sans font-bold text-xs tracking-wider">HL7 FHIR R4</text>
							</motion.g>

							{/* Central EMR Node */}
							<motion.g 
								initial={{ opacity: 0, scale: 0.8 }}
								animate={isInView ? { opacity: 1, scale: 1 } : {}}
								transition={{ duration: 0.5, delay: 0.8 }}
							>
								<motion.circle 
									cx="400" cy="150" r="50" fill="var(--primary)" 
									animate={isInView ? { scale: [1, 1.05, 1] } : {}}
									transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
								/>
								<text x="400" y="145" textAnchor="middle" fill="var(--primary-foreground)" className="font-serif font-bold text-xl">QHealth</text>
								<text x="400" y="165" textAnchor="middle" fill="var(--primary-foreground)" className="font-sans text-[10px] uppercase tracking-widest opacity-80">EMR Core</text>
							</motion.g>

							{/* Terminology Nodes */}
							<TerminologyNode x={650} y={70} title="ICD-10 / SNOMED CT" desc="Diagnoses & Problems" delay={1.2} isInView={isInView} />
							<TerminologyNode x={650} y={125} title="LOINC" desc="Lab Observations" delay={1.4} isInView={isInView} />
							<TerminologyNode x={650} y={175} title="RxNorm" desc="Medications" delay={1.6} isInView={isInView} />
							<TerminologyNode x={650} y={230} title="RVS" desc="Procedures & Surgery" delay={1.8} isInView={isInView} />
						</svg>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
					{blocks.map((block, idx) => (
						<motion.div 
							key={block.title}
							initial={{ opacity: 0, y: 20 }}
							animate={isInView ? { opacity: 1, y: 0 } : {}}
							transition={{ duration: 0.5, delay: 1.5 + idx * 0.1 }}
							className="flex flex-col"
						>
							<div className="w-8 h-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 text-primary">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<polyline points="20 6 9 17 4 12"></polyline>
								</svg>
							</div>
							<h3 className="font-serif text-lg font-semibold text-foreground mb-2">{block.title}</h3>
							<p className="text-sm text-muted-foreground leading-relaxed">{block.desc}</p>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	)
}

function TerminologyNode({ x, y, title, desc, delay, isInView }: { x: number, y: number, title: string, desc: string, delay: number, isInView: boolean }) {
	return (
		<motion.g 
			initial={{ opacity: 0, x: -20 }}
			animate={isInView ? { opacity: 1, x: 0 } : {}}
			transition={{ duration: 0.5, delay }}
		>
			<rect x={x} y={y - 20} width="140" height="40" rx="4" fill="var(--card)" stroke="var(--border)" strokeWidth="1" />
			<circle cx={x} cy={y} r="4" fill="var(--primary)" />
			<text x={x + 15} y={y - 2} fill="var(--foreground)" className="font-sans font-bold text-[11px]">{title}</text>
			<text x={x + 15} y={y + 12} fill="var(--muted-foreground)" className="font-sans text-[9px]">{desc}</text>
		</motion.g>
	)
}
