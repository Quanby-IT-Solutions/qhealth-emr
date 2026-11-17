import { type ReactNode } from "react"
import { Check } from "lucide-react"

import { cn } from "@/core/lib/utils"

const REGISTRATION_STEPS = [
	{ id: "search", label: "Search" },
	{ id: "register", label: "Register" },
	{ id: "success", label: "MRN issued" },
] as const

export type PatientRegistrationStep = (typeof REGISTRATION_STEPS)[number]["id"]

interface PatientRegistrationShellProps {
	step: PatientRegistrationStep
	title: string
	subtitle: string
	notice?: ReactNode
	children: ReactNode
}

function StepBadge({
	index,
	status,
}: {
	index: number
	status: "pending" | "current" | "completed"
}) {
	return (
		<div
			className={cn(
				"flex size-8 items-center justify-center rounded-full border text-xs font-semibold tabular-nums transition-colors sm:size-10 sm:text-sm",
				status === "pending"
					? "border-border/60 bg-background text-muted-foreground"
					: "border-primary bg-primary text-primary-foreground"
			)}
		>
			{status === "completed" ? <Check className="size-4" /> : index + 1}
		</div>
	)
}

export function PatientRegistrationShell({
	step,
	title,
	subtitle,
	notice,
	children,
}: PatientRegistrationShellProps) {
	const currentIndex = REGISTRATION_STEPS.findIndex(item => item.id === step)

	return (
		<div className="relative min-h-full">
			<div
				aria-hidden="true"
				className="from-background via-background to-secondary/30 pointer-events-none absolute inset-0 -z-10 bg-linear-to-b"
			/>

			<div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pt-2 pb-12 sm:px-6 lg:px-8">
				<div className="space-y-3">
					<p className="text-muted-foreground text-[0.68rem] font-medium tracking-[0.24em] uppercase">
						Step {currentIndex + 1} of {REGISTRATION_STEPS.length}
					</p>
					<div className="space-y-2">
						<h2 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
							{title}
						</h2>
						<p className="text-muted-foreground max-w-3xl text-sm sm:text-base">{subtitle}</p>
					</div>
				</div>

				<div className="border-border/60 bg-background/80 rounded-2xl border px-4 py-4 shadow-sm backdrop-blur">
					<div className="grid grid-cols-[minmax(0,1fr)_minmax(1.5rem,1fr)_minmax(0,1fr)_minmax(1.5rem,1fr)_minmax(0,1fr)] items-start gap-2 sm:gap-4">
						{REGISTRATION_STEPS.map((item, index) => {
							const status =
								index < currentIndex ? "completed" : index === currentIndex ? "current" : "pending"

							return (
								<div key={item.id} className="contents">
									<div className="flex min-w-0 flex-col items-center gap-2 text-center">
										<StepBadge index={index} status={status} />
										<p
											className={cn(
												"text-[0.68rem] font-medium tracking-tight sm:text-xs",
												status === "pending" ? "text-muted-foreground" : "text-foreground"
											)}
										>
											{item.label}
										</p>
									</div>

									{index < REGISTRATION_STEPS.length - 1 && (
										<div
											className={cn(
												"mt-5 h-px w-full",
												index < currentIndex ? "bg-primary/40" : "bg-border/60"
											)}
										/>
									)}
								</div>
							)
						})}
					</div>
				</div>

				{notice}

				<div className="pb-2">{children}</div>
			</div>
		</div>
	)
}
