"use client"

import { Navbar } from "./navbar"
import { HeroSection } from "./hero-section"
import { RegulatorySection } from "./regulatory-section"
import { ModulesSection } from "./modules-section"
import { ReportingSection } from "./reporting-section"
import { WorkflowSection } from "./workflow-section"
import { InteropSection } from "./interop-section"
import { TrustSection } from "./trust-section"
import { ClosingSection } from "./closing-section"
import { Footer } from "./footer"

export function LandingPage() {
	return (
		<div className="flex min-h-screen flex-col font-sans antialiased bg-background">
			<Navbar />
			<main className="flex-1">
				<HeroSection />
				<RegulatorySection />
				<ModulesSection />
				<ReportingSection />
				<WorkflowSection />
				<InteropSection />
				<TrustSection />
				<ClosingSection />
			</main>
			<Footer />
		</div>
	)
}
