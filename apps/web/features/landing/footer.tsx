import Link from "next/link"

export function Footer() {
	const currentYear = new Date().getFullYear()

	return (
		<footer className="bg-background pt-20 pb-10 border-t border-border">
			<div className="container mx-auto px-6 max-w-7xl">
				<div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
					<div className="md:col-span-1">
						<div className="flex items-center gap-3 mb-6">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-primary stroke-current">
								<rect x="2" y="2" width="20" height="20" rx="4" strokeWidth="1.5" />
								<path d="M12 7V17M7 12H17" strokeWidth="1.5" strokeLinecap="round" />
							</svg>
							<span className="font-serif text-xl font-bold tracking-tight text-foreground">QHealth</span>
						</div>
						<p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
							A statutorily-compliant clinical platform built specifically for Philippine hospitals.
						</p>
					</div>

					<div className="md:col-span-1">
						<h4 className="font-serif text-lg font-semibold text-foreground mb-4">Modules</h4>
						<ul className="space-y-3 text-sm text-muted-foreground">
							<li><Link href="#modules" className="hover:text-primary transition-colors">Patient Lifecycle</Link></li>
							<li><Link href="#modules" className="hover:text-primary transition-colors">Clinical Practice</Link></li>
							<li><Link href="#modules" className="hover:text-primary transition-colors">Specialized Care</Link></li>
							<li><Link href="#modules" className="hover:text-primary transition-colors">Telemedicine</Link></li>
							<li><Link href="#modules" className="hover:text-primary transition-colors">Advanced RCM</Link></li>
						</ul>
					</div>

					<div className="md:col-span-1">
						<h4 className="font-serif text-lg font-semibold text-foreground mb-4">Compliance</h4>
						<ul className="space-y-3 text-sm text-muted-foreground">
							<li><Link href="#compliance" className="hover:text-primary transition-colors">DPA 2012 / RA 10173</Link></li>
							<li><Link href="#compliance" className="hover:text-primary transition-colors">DOH AHSR</Link></li>
							<li><Link href="#compliance" className="hover:text-primary transition-colors">PIDSR Reporting</Link></li>
							<li><Link href="#compliance" className="hover:text-primary transition-colors">PhilHealth eClaims</Link></li>
							<li><Link href="#compliance" className="hover:text-primary transition-colors">ARTA SLAs</Link></li>
						</ul>
					</div>

					<div className="md:col-span-1">
						<h4 className="font-serif text-lg font-semibold text-foreground mb-4">Company</h4>
						<ul className="space-y-3 text-sm text-muted-foreground">
							<li><Link href="#" className="hover:text-primary transition-colors">About Us</Link></li>
							<li><Link href="#" className="hover:text-primary transition-colors">Contact</Link></li>
							<li><Link href="#" className="hover:text-primary transition-colors">Implementation Methodology</Link></li>
							<li><Link href="#" className="hover:text-primary transition-colors">Security Architecture</Link></li>
						</ul>
					</div>
				</div>

				<div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
					<div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-primary stroke-current opacity-80">
							<rect x="2" y="2" width="20" height="20" rx="4" strokeWidth="1.5" />
							<path d="M12 7V17M7 12H17" strokeWidth="1.5" strokeLinecap="round" />
						</svg>
						<span>&copy; {currentYear} QHealth EMR</span>
						<span className="hidden md:inline text-border">|</span>
						<span>Philippines</span>
					</div>

					<div className="flex items-center gap-4 text-muted-foreground">
						<Link href="#" className="hover:text-primary transition-colors" aria-label="LinkedIn">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="stroke-current">
								<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
								<rect x="2" y="9" width="4" height="12" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
								<circle cx="4" cy="4" r="2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
							</svg>
						</Link>
						<Link href="#" className="hover:text-primary transition-colors" aria-label="Twitter">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="stroke-current">
								<path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
							</svg>
						</Link>
					</div>
				</div>

				<div className="text-center md:text-left text-[11px] text-muted-foreground/60 uppercase tracking-widest font-mono">
					Compliant with the Data Privacy Act of 2012 (RA 10173). HL7 FHIR R4 conformant. NHDR-ready.
				</div>
			</div>
		</footer>
	)
}
