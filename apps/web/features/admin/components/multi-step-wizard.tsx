"use client"

import type { ReactNode } from "react"

import { Button } from "@/core/components/ui/button"
import { cn } from "@/core/lib/utils"

interface MultiStepWizardProps {
	steps: string[]
	currentStep: number
	onNext: () => void
	onBack: () => void
	onSkip?: () => void
	isNextDisabled?: boolean
	isSubmitting?: boolean
	submitLabel?: string
	children: ReactNode
}

export function MultiStepWizard({
	steps,
	currentStep,
	onNext,
	onBack,
	onSkip,
	isNextDisabled,
	isSubmitting,
	submitLabel = "Submit",
	children,
}: MultiStepWizardProps) {
	const isFirst = currentStep === 0
	const isLast = currentStep === steps.length - 1

	return (
		<div className="flex flex-col gap-6">
			{/* Step indicators */}
			<nav aria-label="Progress" className="flex items-center gap-2">
				{steps.map((step, i) => {
					const isDone = i < currentStep
					const isActive = i === currentStep
					return (
						<div key={step} className="flex items-center gap-2">
							<div className="flex items-center gap-1.5">
								<div
									className={cn(
										"flex size-6 items-center justify-center rounded-full text-xs font-semibold",
										isDone && "bg-primary text-primary-foreground",
										isActive && "border-primary text-primary border-2",
										!isDone &&
											!isActive &&
											"border-muted-foreground/30 text-muted-foreground border"
									)}
								>
									{isDone ? "✓" : i + 1}
								</div>
								<span
									className={cn(
										"text-xs font-medium",
										isActive ? "text-foreground" : "text-muted-foreground"
									)}
								>
									{step}
								</span>
							</div>
							{i < steps.length - 1 && (
								<div
									className={cn("h-px w-6 flex-1", i < currentStep ? "bg-primary" : "bg-muted")}
								/>
							)}
						</div>
					)
				})}
			</nav>

			{/* Step content */}
			<div>{children}</div>

			{/* Navigation */}
			<div className="flex items-center justify-between">
				<Button type="button" variant="outline" onClick={onBack} disabled={isFirst}>
					Back
				</Button>
				<div className="flex items-center gap-2">
					{onSkip && !isLast && (
						<Button type="button" variant="ghost" onClick={onSkip}>
							Skip
						</Button>
					)}
					<Button type="button" onClick={onNext} disabled={isNextDisabled || isSubmitting}>
						{isSubmitting ? "Saving..." : isLast ? submitLabel : "Next"}
					</Button>
				</div>
			</div>
		</div>
	)
}
