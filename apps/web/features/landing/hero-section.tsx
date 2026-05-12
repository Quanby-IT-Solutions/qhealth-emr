"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import Link from "next/link"

export function HeroSection() {
	const { scrollY } = useScroll()
	const y = useTransform(scrollY, [0, 500], [0, 150])
	const opacity = useTransform(scrollY, [0, 300], [1, 0])

	const seals = [
		{ name: "DOH", desc: "AHSR & Licensing" },
		{ name: "PhilHealth", desc: "eClaims & CF4" },
		{ name: "FDA", desc: "ePrescription" },
		{ name: "PDEA", desc: "S-2 Validation" },
		{ name: "NHDR", desc: "FHIR R4 Ready" },
		{ name: "DPA", desc: "RA 10173" },
	]

	const containerVariants = {
		hidden: { opacity: 0 },
		show: {
			opacity: 1,
			transition: { staggerChildren: 0.07, delayChildren: 0.2 },
		},
	}

	const itemVariants = {
		hidden: { opacity: 0, y: 20 },
		show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
	}

	return (
		<section className="relative min-h-[90vh] flex flex-col justify-center pt-24 pb-12 overflow-hidden bg-background">
			{/* Parallax Background Grid */}
			<motion.div 
				style={{ y, opacity }} 
				className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none"
			>
				<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="opacity-[0.03] text-foreground stroke-current">
					<defs>
						<pattern id="blueprint" width="40" height="40" patternUnits="userSpaceOnUse">
							<path d="M 40 0 L 0 0 0 40" fill="none" strokeWidth="0.5" />
						</pattern>
					</defs>
					<rect width="100%" height="100%" fill="url(#blueprint)" />
				</svg>
			</motion.div>

			<div className="container relative z-10 mx-auto px-6 max-w-7xl">
				<div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
					{/* Text Content */}
					<motion.div 
						className="lg:col-span-7 flex flex-col items-start text-left"
						initial="hidden"
						animate="show"
						variants={containerVariants}
					>
						<motion.h1 
							variants={itemVariants}
							className="font-serif text-5xl md:text-6xl lg:text-7xl font-medium tracking-tight leading-[1.1] text-foreground mb-8 max-w-3xl"
						>
							An Electronic Medical Record built for the realities of <span className="text-primary italic font-semibold">Philippine healthcare.</span>
						</motion.h1>
						
						<motion.p 
							variants={itemVariants}
							className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl font-sans"
						>
							Engineered around DOH licensing requirements, PhilHealth eClaims automation, FDA and PDEA prescription mandates, and the seven patient flows that define daily hospital operations. Compliant by design. Reportable by default. Resilient through offline mode.
						</motion.p>
						
						<motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 mb-16 w-full sm:w-auto">
							<Link href="#briefing" className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-base font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
								Request a Briefing
							</Link>
							<Link href="#compliance-brief" className="inline-flex h-12 items-center justify-center rounded-md border border-border bg-transparent px-8 text-base font-medium text-foreground shadow-sm transition-colors hover:bg-muted group">
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2 text-foreground/70 group-hover:text-foreground">
									<path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M7 10L12 15M12 15L17 10M12 15V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
								</svg>
								Download Compliance Brief
							</Link>
						</motion.div>
					</motion.div>

					{/* Artifact Grid */}
					<motion.div 
						className="lg:col-span-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-4 md:gap-6"
						initial="hidden"
						animate="show"
						variants={containerVariants}
					>
						{seals.map((seal, i) => (
							<motion.div 
								key={seal.name} 
								variants={itemVariants}
								className="flex flex-col items-center justify-center p-6 border border-border/60 rounded-xl bg-card/50 backdrop-blur-sm shadow-sm"
								whileHover={{ scale: 1.02, borderColor: "var(--primary)" }}
							>
								<div className="w-16 h-16 rounded-full border-[1.5px] border-primary text-primary flex items-center justify-center mb-4">
									<span className="font-serif font-bold text-lg">{seal.name}</span>
								</div>
								<span className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">{seal.desc}</span>
							</motion.div>
						))}
					</motion.div>
				</div>
			</div>

			{/* Metadata Row */}
			<motion.div 
				className="container mx-auto px-6 max-w-7xl mt-auto pt-12"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 1, duration: 1 }}
			>
				<div className="w-full h-px bg-border mb-4" />
				<div className="flex flex-wrap justify-between gap-4 text-xs font-mono text-muted-foreground uppercase tracking-wider">
					<span>HL7 FHIR R4</span>
					<span className="hidden sm:inline">·</span>
					<span>NHDR-Ready</span>
					<span className="hidden md:inline">·</span>
					<span>DOH AHSR Compliant</span>
					<span className="hidden lg:inline">·</span>
					<span>PhilHealth eClaims</span>
					<span className="hidden sm:inline">·</span>
					<span>DPA 2012</span>
					<span className="hidden sm:inline">·</span>
					<span>ARTA SLA Tracking</span>
				</div>
			</motion.div>
		</section>
	)
}
