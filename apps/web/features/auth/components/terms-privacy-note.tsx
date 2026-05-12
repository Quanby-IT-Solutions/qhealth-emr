import Link from "next/link"

import { buttonVariants } from "@/core/components/ui/button"
import { cn } from "@/core/lib/utils"

export function TermsPrivacyNote() {
	return (
		<div className="flex flex-col items-center justify-center gap-2 px-6 text-center text-xs text-muted-foreground font-sans max-w-lg mx-auto">
			<div className="flex items-center gap-1.5 justify-center mb-1 text-primary">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
					<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
					<path d="M9 12l2 2 4-4" />
				</svg>
				<span className="font-medium uppercase tracking-wider text-[10px]">Secure Gateway</span>
			</div>
			<p className="leading-relaxed">
				By signing in, you agree to our{" "}
				<Link
					className={cn(buttonVariants({ variant: "link" }), "text-foreground hover:text-primary transition-colors h-auto px-0 underline underline-offset-4 decoration-border hover:decoration-primary")}
					href="#"
				>
					Terms of Service
				</Link>{" "}
				and{" "}
				<Link
					className={cn(buttonVariants({ variant: "link" }), "text-foreground hover:text-primary transition-colors h-auto px-0 underline underline-offset-4 decoration-border hover:decoration-primary")}
					href="#"
				>
					Privacy Policy
				</Link>
				, and acknowledge our compliance with the Data Privacy Act of 2012 (RA 10173).
			</p>
		</div>
	)
}
