import Image from "next/image"
import Link from "next/link"

export function Footer() {
	const currentYear = new Date().getFullYear()

	return (
		<footer className="bg-background border-border border-t pt-20 pb-10">
			<div className="container mx-auto max-w-7xl px-6">
				<div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-4">
					<div className="md:col-span-1">
						<div className="mb-6 flex items-center gap-3">
							<Image
								src="/quanby-mark.png"
								alt="Quanby Solutions, Inc."
								width={512}
								height={512}
								className="h-14 w-14 object-contain"
							/>
							<span className="text-foreground text-lg font-semibold tracking-tight">
								Quanby Solutions
							</span>
						</div>
						<p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
							A statutorily-compliant clinical platform built specifically for Philippine hospitals.
						</p>
					</div>

					<div className="md:col-span-1">
						<h4 className="text-foreground mb-4 font-serif text-lg font-semibold">Modules</h4>
						<ul className="text-muted-foreground space-y-3 text-sm">
							<li>
								<Link href="#modules" className="hover:text-primary transition-colors">
									Patient Lifecycle
								</Link>
							</li>
							<li>
								<Link href="#modules" className="hover:text-primary transition-colors">
									Clinical Practice
								</Link>
							</li>
							<li>
								<Link href="#modules" className="hover:text-primary transition-colors">
									Specialized Care
								</Link>
							</li>
							<li>
								<Link href="#modules" className="hover:text-primary transition-colors">
									Telemedicine
								</Link>
							</li>
							<li>
								<Link href="#modules" className="hover:text-primary transition-colors">
									Advanced RCM
								</Link>
							</li>
						</ul>
					</div>

					<div className="md:col-span-1">
						<h4 className="text-foreground mb-4 font-serif text-lg font-semibold">Compliance</h4>
						<ul className="text-muted-foreground space-y-3 text-sm">
							<li>
								<Link href="#compliance" className="hover:text-primary transition-colors">
									DPA 2012 / RA 10173
								</Link>
							</li>
							<li>
								<Link href="#compliance" className="hover:text-primary transition-colors">
									DOH AHSR
								</Link>
							</li>
							<li>
								<Link href="#compliance" className="hover:text-primary transition-colors">
									PIDSR Reporting
								</Link>
							</li>
							<li>
								<Link href="#compliance" className="hover:text-primary transition-colors">
									PhilHealth eClaims
								</Link>
							</li>
							<li>
								<Link href="#compliance" className="hover:text-primary transition-colors">
									ARTA SLAs
								</Link>
							</li>
						</ul>
					</div>

					<div className="md:col-span-1">
						<h4 className="text-foreground mb-4 font-serif text-lg font-semibold">Company</h4>
						<ul className="text-muted-foreground space-y-3 text-sm">
							<li>
								<Link href="#" className="hover:text-primary transition-colors">
									About Us
								</Link>
							</li>
							<li>
								<Link href="#" className="hover:text-primary transition-colors">
									Contact
								</Link>
							</li>
							<li>
								<Link href="#" className="hover:text-primary transition-colors">
									Implementation Methodology
								</Link>
							</li>
							<li>
								<Link href="#" className="hover:text-primary transition-colors">
									Security Architecture
								</Link>
							</li>
						</ul>
					</div>
				</div>

				<div className="border-border mb-4 flex flex-col items-center justify-between gap-4 border-t pt-8 md:flex-row">
					<div className="text-muted-foreground flex items-center gap-4 text-sm font-medium">
						<span>&copy; {currentYear} Quanby</span>
						<span className="text-border hidden md:inline">|</span>
						<span>Philippines</span>
					</div>

					<div className="text-muted-foreground flex items-center gap-4">
						<Link href="#" className="hover:text-primary transition-colors" aria-label="LinkedIn">
							<svg
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								className="stroke-current"
							>
								<path
									d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
								<rect
									x="2"
									y="9"
									width="4"
									height="12"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
								<circle
									cx="4"
									cy="4"
									r="2"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</Link>
						<Link href="#" className="hover:text-primary transition-colors" aria-label="Twitter">
							<svg
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								className="stroke-current"
							>
								<path
									d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</Link>
					</div>
				</div>

				<div className="text-muted-foreground/60 text-center font-mono text-[11px] tracking-widest uppercase md:text-left">
					Compliant with the Data Privacy Act of 2012 (RA 10173). HL7 FHIR R4 conformant.
					NHDR-ready.
				</div>
			</div>
		</footer>
	)
}
