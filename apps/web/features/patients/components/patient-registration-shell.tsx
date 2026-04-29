import { type ReactNode } from "react"
import { Check, IdCard } from "lucide-react"

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
	headerAction?: ReactNode
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
				"flex size-10 items-center justify-center rounded-full border text-sm font-semibold tabular-nums transition-colors",
				status === "pending"
					? "border-border/60 bg-background text-muted-foreground"
					: "border-foreground bg-foreground text-background"
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
	headerAction,
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

			<div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-12 sm:px-6 lg:px-8">
				<div className="border-border/60 bg-background/80 sticky top-0 z-10 -mx-4 border-b px-4 py-5 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
					<div className="mx-auto flex max-w-6xl items-center gap-3">
						<div className="bg-foreground text-background flex size-11 items-center justify-center rounded-2xl shadow-sm">
							<IdCard className="size-5" />
						</div>
						<div className="min-w-0">
							<p className="text-muted-foreground text-[0.68rem] font-medium tracking-[0.24em] uppercase">
								Registration
							</p>
							<h1 className="text-base font-semibold tracking-tight">
								Patient Registration &amp; MRN
							</h1>
						</div>
					</div>
				</div>

				<div className="flex flex-col gap-6 pt-1 lg:flex-row lg:items-end lg:justify-between">
					<div className="space-y-3">
						<p className="text-muted-foreground text-[0.68rem] font-medium tracking-[0.24em] uppercase">
							Step {currentIndex + 1} of {REGISTRATION_STEPS.length}
						</p>
						<div className="space-y-2">
							<h2 className="text-foreground text-3xl font-semibold tracking-tight">{title}</h2>
							<p className="text-muted-foreground max-w-3xl text-base">{subtitle}</p>
						</div>
					</div>
					{headerAction && <div className="shrink-0">{headerAction}</div>}
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
												"text-xs font-medium tracking-tight",
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
												index < currentIndex ? "bg-foreground/20" : "bg-border/60"
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
