"use client"

import { motion } from "framer-motion"

export function RegulatorySection() {
	const regulations = [
		{
			id: "doh",
			title: "DOH",
			desc: "Licensing & Institutional Reporting",
			points: ["AHSR generation (BOR, Mortality, HAI)", "LTO compliance tracking", "Facility-level indicators"],
			icon: (
				<svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-primary stroke-current">
					<path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4a2 2 0 0 1 4 0v4M12 11v4M10 13h4" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
				</svg>
			)
		},
		{
			id: "philhealth",
			title: "PhilHealth",
			desc: "Claims & Financial Integration",
			points: ["eClaims CF4 & CF5 automation", "eSOA generation", "CEWS & Konsulta capitation", "Z-Benefits tracking"],
			icon: (
				<svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-primary stroke-current">
					<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
					<path d="M12 8v8M8 12h8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
				</svg>
			)
		},
		{
			id: "fda",
			title: "FDA",
			desc: "Prescription & Formulary Mandates",
			points: ["Generics Act enforcement", "e-Prescription compliance", "Formulary restrictions"],
			icon: (
				<svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-primary stroke-current">
					<path d="M9 12l2 2 4-4M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
				</svg>
			)
		},
		{
			id: "pdea",
			title: "PDEA",
			desc: "Regulated Substance Control",
			points: ["S-2 license validation checks", "Dangerous drug inventory logs", "Prescriber verification"],
			icon: (
				<svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-primary stroke-current">
					<path d="M10 14.5a2.5 2.5 0 1 0 4 0v-5a2.5 2.5 0 1 0-4 0v5zM12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
				</svg>
			)
		},
		{
			id: "dpa",
			title: "DPA 2012",
			desc: "Privacy & Data Protection",
			points: ["Granular consent management", "End-to-end PHI encryption", "Comprehensive audit trails"],
			icon: (
				<svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-primary stroke-current">
					<rect x="5" y="11" width="14" height="10" rx="2" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
					<path d="M8 11V7a4 4 0 1 1 8 0v4M12 16v.01" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
				</svg>
			)
		},
		{
			id: "arta",
			title: "ARTA",
			desc: "SLA & Time-and-Motion Tracking",
			points: ["Citizen's Charter compliance", "7 mandated patient flow SLAs", "Real-time bottleneck alerts"],
			icon: (
				<svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-primary stroke-current">
					<circle cx="12" cy="12" r="10" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
					<path d="M12 6v6l4 2M3.05 11a9 9 0 1 1 5.95 9.8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 2"/>
				</svg>
			)
		},
		{
			id: "pidsr",
			title: "PIDSR",
			desc: "Disease Surveillance",
			points: ["Category 1 & 2 disease flagging", "Syndromic keyword detection", "Automated transmission prep"],
			icon: (
				<svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-primary stroke-current">
					<path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
					<circle cx="12" cy="10" r="3" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
					<path d="M12 13v4" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
				</svg>
			)
		}
	]

	const containerVariants = {
		hidden: { opacity: 0 },
		show: {
			opacity: 1,
			transition: { staggerChildren: 0.1 },
		},
	}

	const itemVariants = {
		hidden: { opacity: 0, y: 30 },
		show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
	}

	return (
		<section id="compliance" className="py-24 bg-card border-t border-border">
			<div className="container mx-auto px-6 max-w-7xl">
				<motion.div 
					className="max-w-3xl mb-16"
					initial="hidden"
					whileInView="show"
					viewport={{ once: true, amount: 0.3 }}
					variants={containerVariants}
				>
					<motion.h2 variants={itemVariants} className="font-serif text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight text-foreground mb-6">
						Built around the regulatory landscape Philippine hospitals actually face.
					</motion.h2>
					<motion.p variants={itemVariants} className="text-lg text-muted-foreground font-sans">
						Compliance is not an afterthought or a separate module. It is the architectural foundation of the entire clinical platform, organized as a map of operational mastery rather than a problem list.
					</motion.p>
				</motion.div>

				<motion.div 
					className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
					initial="hidden"
					whileInView="show"
					viewport={{ once: true, amount: 0.1 }}
					variants={containerVariants}
				>
					{regulations.map((reg) => (
						<motion.div 
							key={reg.id}
							variants={itemVariants}
							whileHover={{ scale: 1.015, borderColor: "var(--primary)" }}
							className="group flex flex-col p-8 rounded-xl bg-background border border-border shadow-sm transition-all duration-300 hover:shadow-md"
						>
							<div className="mb-6 opacity-80 group-hover:opacity-100 transition-opacity">
								{reg.icon}
							</div>
							<h3 className="font-serif text-2xl font-semibold mb-2 text-foreground">{reg.title}</h3>
							<p className="text-sm font-medium text-primary mb-6">{reg.desc}</p>
							
							<ul className="mt-auto space-y-3">
								{reg.points.map((point, idx) => (
									<li key={idx} className="flex items-start text-sm text-muted-foreground">
										<svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mr-2 mt-0.5 text-primary/70 shrink-0">
											<path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
										</svg>
										<span className="leading-tight">{point}</span>
									</li>
								))}
							</ul>
						</motion.div>
					))}
				</motion.div>
			</div>
		</section>
	)
}
