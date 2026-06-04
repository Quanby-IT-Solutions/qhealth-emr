"use client"

import Link from "next/link"
import { motion, useScroll, useTransform, type Variants } from "framer-motion"

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

	const containerVariants: Variants = {
		hidden: { opacity: 0 },
		show: {
			opacity: 1,
			transition: { staggerChildren: 0.07, delayChildren: 0.2 },
		},
	}

	const itemVariants: Variants = {
		hidden: { opacity: 0, y: 20 },
		show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
	}

	return (
		<section className="bg-background relative flex min-h-[90vh] flex-col justify-center overflow-hidden pt-24 pb-12">
			{/* Parallax Background Grid */}
			<motion.div
				style={{ y, opacity }}
				className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
			>
				<svg
					width="100%"
					height="100%"
					xmlns="http://www.w3.org/2000/svg"
					className="text-foreground stroke-current opacity-[0.03]"
				>
					<defs>
						<pattern id="blueprint" width="40" height="40" patternUnits="userSpaceOnUse">
							<path d="M 40 0 L 0 0 0 40" fill="none" strokeWidth="0.5" />
						</pattern>
					</defs>
					<rect width="100%" height="100%" fill="url(#blueprint)" />
				</svg>
			</motion.div>

			<div className="relative z-10 container mx-auto max-w-7xl px-6">
				<div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
					{/* Text Content */}
					<motion.div
						className="flex flex-col items-start text-left lg:col-span-7"
						initial="hidden"
						animate="show"
						variants={containerVariants}
					>
						<motion.h1
							variants={itemVariants}
							className="text-foreground mb-8 max-w-3xl font-serif text-5xl leading-[1.1] font-medium tracking-tight md:text-6xl lg:text-7xl"
						>
							An Electronic Medical Record built for the realities of{" "}
							<span className="text-primary font-semibold italic">Philippine healthcare.</span>
						</motion.h1>

						<motion.p
							variants={itemVariants}
							className="text-muted-foreground mb-10 max-w-2xl font-sans text-lg leading-relaxed md:text-xl"
						>
							Engineered around DOH licensing requirements, PhilHealth eClaims automation, FDA and
							PDEA prescription mandates, and the seven patient flows that define daily hospital
							operations. Compliant by design. Reportable by default. Resilient through offline
							mode.
						</motion.p>

						<motion.div
							variants={itemVariants}
							className="mb-16 flex w-full flex-col gap-4 sm:w-auto sm:flex-row"
						>
							<Link
								href="#briefing"
								className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-12 items-center justify-center rounded-md px-8 text-base font-medium shadow transition-colors"
							>
								Request a Briefing
							</Link>
							<Link
								href="#compliance-brief"
								className="border-border text-foreground hover:bg-muted group inline-flex h-12 items-center justify-center rounded-md border bg-transparent px-8 text-base font-medium shadow-sm transition-colors"
							>
								<svg
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
									className="text-foreground/70 group-hover:text-foreground mr-2"
								>
									<path
										d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M7 10L12 15M12 15L17 10M12 15V3"
										stroke="currentColor"
										strokeWidth="1.5"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
								Download Compliance Brief
							</Link>
						</motion.div>
					</motion.div>

					{/* Artifact Grid */}
					<motion.div
						className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:col-span-5 lg:grid-cols-2"
						initial="hidden"
						animate="show"
						variants={containerVariants}
					>
						{seals.map((seal, i) => (
							<motion.div
								key={seal.name}
								variants={itemVariants}
								className="border-border/60 bg-card/50 flex flex-col items-center justify-center rounded-xl border p-6 shadow-sm backdrop-blur-sm"
								whileHover={{ scale: 1.02, borderColor: "var(--primary)" }}
							>
								<div className="border-primary text-primary mb-4 flex h-16 w-16 items-center justify-center rounded-full border-[1.5px]">
									<span className="font-serif text-lg font-bold">{seal.name}</span>
								</div>
								<span className="text-muted-foreground text-center text-xs font-medium tracking-wider uppercase">
									{seal.desc}
								</span>
							</motion.div>
						))}
					</motion.div>
				</div>
			</div>

			{/* Metadata Row */}
			<motion.div
				className="container mx-auto mt-auto max-w-7xl px-6 pt-12"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 1, duration: 1 }}
			>
				<div className="bg-border mb-4 h-px w-full" />
				<div className="text-muted-foreground flex flex-wrap justify-between gap-4 font-mono text-xs tracking-wider uppercase">
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
