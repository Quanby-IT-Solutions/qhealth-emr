"use client"

import { motion } from "framer-motion"

export function TrustSection() {
	const pillars = [
		{
			title: "DPA 2012 Compliance",
			desc: "Full adherence to RA 10173. Data-at-rest and data-in-transit encryption, explicit consent management, and Right to be Forgotten workflows.",
			icon: (
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="stroke-current">
					<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
					<path d="M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0" strokeWidth="1.5"/>
				</svg>
			)
		},
		{
			title: "Role-Based Access",
			desc: "Principle of least privilege enforced across 18+ defined hospital roles. Doctors only see their patients; billers only see financial data.",
			icon: (
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="stroke-current">
					<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
				</svg>
			)
		},
		{
			title: "Comprehensive Audit Trails",
			desc: "Every read, write, and deletion of PHI is immutably logged with user ID, timestamp, and IP address. Readily viewable by the DPO.",
			icon: (
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="stroke-current">
					<path d="M12 20h9M3 4h18M3 8h18M3 12h10M3 16h6" strokeWidth="1.5" strokeLinecap="round"/>
					<path d="M14 16l2 2 4-4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
				</svg>
			)
		},
		{
			title: "Break-Glass Protocols",
			desc: "Emergency override access for life-critical situations when normal access is restricted. Automatically triggers high-priority audit alerts.",
			icon: (
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="stroke-current">
					<rect x="3" y="11" width="18" height="11" rx="2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
					<path d="M7 11V7a5 5 0 0 1 10 0v4M12 16v.01M9 3L15 9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
				</svg>
			)
		},
		{
			title: "Offline Mode Resilience",
			desc: "Local caching of active inpatient summaries. Ensures clinical continuity during ISP outages, with automatic synchronization upon reconnection.",
			icon: (
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="stroke-current">
					<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
					<path d="M12 15V9M9 12l3 3 3-3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
				</svg>
			)
		},
		{
			title: "Patient Read Access",
			desc: "Secure patient portal exposing static daily clinical summaries. Architected to prevent main database degradation from patient queries.",
			icon: (
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="stroke-current">
					<circle cx="12" cy="8" r="5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
					<path d="M20 21a8 8 0 1 0-16 0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
		hidden: { opacity: 0, y: 20 },
		show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
	}

	return (
		<section className="py-24 bg-background">
			<div className="container mx-auto px-6 max-w-7xl">
				<div className="text-center max-w-3xl mx-auto mb-16">
					<motion.h2 
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						className="font-serif text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight text-foreground mb-6"
					>
						Engineered for Privacy.<br/>Resilient by Design.
					</motion.h2>
					<motion.p 
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ delay: 0.1 }}
						className="text-lg text-muted-foreground font-sans"
					>
						Clinical data is a sacred trust. Our security architecture ensures PHI remains protected from external threats and internal misuse.
					</motion.p>
				</div>

				<motion.div 
					className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
					initial="hidden"
					whileInView="show"
					viewport={{ once: true, amount: 0.2 }}
					variants={containerVariants}
				>
					{pillars.map((pillar) => (
						<motion.div 
							key={pillar.title}
							variants={itemVariants}
							className="group flex flex-col p-8 rounded-xl bg-card border border-border/60 hover:border-primary/50 transition-colors shadow-sm hover:shadow"
						>
							<div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform duration-300">
								{pillar.icon}
							</div>
							<h3 className="font-serif text-xl font-semibold text-foreground mb-3">{pillar.title}</h3>
							<p className="text-sm text-muted-foreground leading-relaxed">{pillar.desc}</p>
						</motion.div>
					))}
				</motion.div>
			</div>
		</section>
	)
}
