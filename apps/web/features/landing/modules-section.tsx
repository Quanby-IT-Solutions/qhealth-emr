"use client"

import { motion, type Variants } from "framer-motion"

export function ModulesSection() {
	const domains = [
		{
			title: "Patient Lifecycle",
			modules: [
				{ name: "ADT & Bed Management", desc: "Real-time census, transfer protocols, and LTO capacity tracking.", ph: "DOH Bed Capacity Tracking", icon: "bed" },
				{ name: "Emergency & Tele-Triage", desc: "Integrated ER triage with digital queuing and acuity scoring.", ph: "OECB Routing", icon: "emergency" },
				{ name: "Operating Room", desc: "Surgical scheduling, pre-op clearance, and post-op recovery tracking.", ph: "RVS Code Mapping", icon: "surgery" },
				{ name: "Pharmacy Dispensing", desc: "Inventory depletion, unit-dose dispensing, and barcode verification.", icon: "dispense" }
			]
		},
		{
			title: "Clinical Practice",
			modules: [
				{ name: "Clinical Documentation", desc: "Structured progress notes, SOAP formats, and narrative entries.", icon: "doc" },
				{ name: "CPOE & e-Prescribing", desc: "Computerized provider order entry with interaction checking.", ph: "Generics Act Enforcement", icon: "cpoe" },
				{ name: "Vitals & Flowsheets", desc: "Customizable observation charting and Early Warning Scores (EWS).", icon: "vitals" },
				{ name: "Problems & Allergies", desc: "Active and historical problem list management via ICD-10.", icon: "allergies" },
				{ name: "Nursing & MAR/TAR", desc: "Medication administration records and treatment execution workflows.", icon: "nursing" },
				{ name: "Pharmacy Verify", desc: "Pharmacist clinical review of provider orders prior to dispensing.", icon: "verify" }
			]
		},
		{
			title: "Specialized Care & Compliance",
			modules: [
				{ name: "Maternal & Newborn", desc: "Partograph, newborn screening, and delivery documentation.", ph: "MNDRS Triggers", icon: "maternal" },
				{ name: "Laboratory & Blood Bank", desc: "LIS bidirectional interface and blood product traceability.", icon: "lab" },
				{ name: "RIS/PACS Link", desc: "Radiology orders and study viewing integration.", icon: "rad" },
				{ name: "Telemedicine", desc: "Secure video consultations linked directly to patient charts.", icon: "tele" },
				{ name: "Advanced RCM & Claims", desc: "Revenue cycle management tightly coupled with clinical events.", ph: "PhilHealth CF4/CF5 Auto-generation", icon: "rcm" }
			]
		}
	]

	const containerVariants: Variants = {
		hidden: { opacity: 0 },
		show: {
			opacity: 1,
			transition: { staggerChildren: 0.1 },
		},
	}

	const itemVariants: Variants = {
		hidden: { opacity: 0, y: 20 },
		show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
	}

	const renderIcon = (type: string) => {
		switch(type) {
			case 'bed': return <path d="M3 12h18M3 16h18M5 8h4v4H5zM15 8h4v4h-4z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
			case 'emergency': return <path d="M12 4v16M4 12h16M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
			case 'surgery': return <path d="M6 18l6-6 6 6M12 12V4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
			case 'dispense': return <path d="M10 21h4M12 17v4M7 3h10v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V3zM7 7h10" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
			case 'doc': return <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 3v5h5M16 13H8M16 17H8M10 9H8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
			case 'cpoe': return <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
			case 'vitals': return <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
			case 'allergies': return <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
			case 'nursing': return <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M15 2H9v4h6V2zM9 12h6M9 16h6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
			case 'verify': return <path d="M9 12l2 2 4-4M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
			case 'maternal': return <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 16v-4m0-4h.01" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
			case 'lab': return <path d="M10 2v4M14 2v4M7 22h10M12 6v16M8 12h8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
			case 'rad': return <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242M12 12v9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
			case 'tele': return <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14v-4zM3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
			case 'rcm': return <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
			default: return <path d="M5 12h14M12 5v14" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
		}
	}

	return (
		<section id="modules" className="py-24 bg-background">
			<div className="container mx-auto px-6 max-w-7xl">
				<motion.div 
					className="max-w-3xl mb-16"
					initial="hidden"
					whileInView="show"
					viewport={{ once: true, amount: 0.3 }}
					variants={containerVariants}
				>
					<motion.h2 variants={itemVariants} className="font-serif text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight text-foreground mb-6">
						Comprehensive Clinical Domains
					</motion.h2>
					<motion.p variants={itemVariants} className="text-lg text-muted-foreground font-sans">
						Fourteen core modules engineered as a unified clinical system, eliminating data silos and redundant documentation across the care continuum.
					</motion.p>
				</motion.div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8">
					{domains.map((domain, dIdx) => (
						<motion.div 
							key={domain.title}
							initial="hidden"
							whileInView="show"
							viewport={{ once: true, amount: 0.1 }}
							variants={containerVariants}
							className="flex flex-col gap-6"
						>
							<motion.div variants={itemVariants} className="border-b border-border pb-4 mb-2">
								<h3 className="font-serif text-2xl font-semibold text-foreground">{domain.title}</h3>
							</motion.div>

							{domain.modules.map((mod, mIdx) => (
								<motion.div 
									key={mod.name}
									variants={itemVariants}
									className="flex flex-col p-6 rounded-lg bg-card border border-border/60 shadow-sm hover:shadow-md transition-shadow"
								>
									<div className="flex items-center gap-4 mb-4">
										<div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center text-primary shrink-0">
											<svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="stroke-current">
												{renderIcon(mod.icon)}
											</svg>
										</div>
										<h4 className="font-serif text-lg font-medium text-foreground leading-tight">{mod.name}</h4>
									</div>
									<p className="text-sm text-muted-foreground mb-4 flex-grow">{mod.desc}</p>
									
									{mod.ph && (
										<div className="mt-auto pt-4 border-t border-border/40">
											<div className="flex items-center gap-2 pl-3 border-l-2 border-primary">
												<span className="text-[11px] font-mono uppercase tracking-wider text-primary font-semibold">Philippine Localization:</span>
												<span className="text-xs text-foreground font-medium">{mod.ph}</span>
											</div>
										</div>
									)}
								</motion.div>
							))}
						</motion.div>
					))}
				</div>
			</div>
		</section>
	)
}
