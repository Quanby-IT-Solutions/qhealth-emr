"use client"

import Link from "next/link"
import { motion } from "framer-motion"

export function ClosingSection() {
	return (
		<section
			id="briefing"
			className="bg-background border-border relative overflow-hidden border-t py-32"
		>
			{/* Decorative background element */}
			<div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center opacity-[0.02]">
				<svg
					width="600"
					height="600"
					viewBox="0 0 24 24"
					fill="none"
					className="text-foreground stroke-current"
					strokeWidth="0.2"
				>
					<circle cx="12" cy="12" r="10" />
					<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
					<path d="M2 12h20" />
				</svg>
			</div>

			<div className="relative z-10 container mx-auto max-w-4xl px-6 text-center">
				<motion.h2
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					className="text-foreground mb-8 font-serif text-4xl font-medium tracking-tight md:text-5xl lg:text-6xl"
				>
					Filipino healthcare deserves software built for the Philippines.
				</motion.h2>

				<motion.p
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ delay: 0.1 }}
					className="text-muted-foreground mb-12 font-sans text-lg leading-relaxed md:text-xl"
				>
					Not a generic EMR with localization patches. A clinical system designed from the first
					line of code around DOH licensing, PhilHealth eClaims, FDA prescriptions, PDEA dangerous
					drugs, ARTA Citizen&apos;s Charter, and the seven patient flows that define every
					Philippine hospital day.
				</motion.p>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ delay: 0.2 }}
					className="mb-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
				>
					<button className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-12 w-full items-center justify-center rounded-md px-8 text-base font-medium shadow transition-colors sm:w-auto">
						Request a Hospital Briefing
					</button>
					<button className="border-border text-foreground hover:bg-muted group inline-flex h-12 w-full items-center justify-center rounded-md border bg-transparent px-8 text-base font-medium shadow-sm transition-colors sm:w-auto">
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							className="text-foreground/70 group-hover:text-foreground mr-2 stroke-current"
						>
							<path
								d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M7 10L12 15M12 15L17 10M12 15V3"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
						Download Compliance Brief
					</button>
				</motion.div>

				<motion.div
					initial={{ opacity: 0 }}
					whileInView={{ opacity: 1 }}
					viewport={{ once: true }}
					transition={{ delay: 0.4 }}
					className="text-muted-foreground flex items-center justify-center gap-2 text-sm font-medium tracking-wider uppercase"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="stroke-current">
						<path
							d="M9 12l2 2 4-4M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
					Built for DOH-licensed hospitals across the Philippines.
				</motion.div>
			</div>
		</section>
	)
}
