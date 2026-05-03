"use client"

import type { InputHTMLAttributes } from "react"
import { forwardRef, useCallback, useState } from "react"

import { cn } from "@/core/lib/utils"

const formatter = new Intl.NumberFormat("en-PH", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
})

function parseNumeric(raw: string): number {
	const cleaned = raw.replace(/[^0-9.]/g, "")
	const parsed = parseFloat(cleaned)
	return isNaN(parsed) ? 0 : parsed
}

interface MoneyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
	value: number
	onChange: (value: number) => void
	step?: number
	/** Currency code displayed as prefix, defaults to "₱" */
	currencySymbol?: string
	className?: string
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
	({ value, onChange, step = 1, currencySymbol = "₱", className, disabled, ...props }, ref) => {
		const [displayValue, setDisplayValue] = useState(() => formatter.format(value))
		const [focused, setFocused] = useState(false)

		const handleFocus = useCallback(() => {
			setFocused(true)
			setDisplayValue(value === 0 ? "" : String(value))
		}, [value])

		const handleBlur = useCallback(() => {
			setFocused(false)
			const parsed = parseNumeric(displayValue)
			onChange(parsed)
			setDisplayValue(formatter.format(parsed))
		}, [displayValue, onChange])

		const handleChange = useCallback(
			(e: React.ChangeEvent<HTMLInputElement>) => {
				const raw = e.target.value
				if (/^[0-9]*\.?[0-9]*$/.test(raw) || raw === "") {
					setDisplayValue(raw)
				}
			},
			[]
		)

		const handleKeyDown = useCallback(
			(e: React.KeyboardEvent<HTMLInputElement>) => {
				if (e.key === "ArrowUp") {
					e.preventDefault()
					const next = Math.max(0, parseNumeric(displayValue) + step)
					onChange(next)
					setDisplayValue(focused ? String(next) : formatter.format(next))
				} else if (e.key === "ArrowDown") {
					e.preventDefault()
					const next = Math.max(0, parseNumeric(displayValue) - step)
					onChange(next)
					setDisplayValue(focused ? String(next) : formatter.format(next))
				}
			},
			[displayValue, focused, onChange, step]
		)

		return (
			<div className={cn("relative flex items-center", className)}>
				<span className="absolute left-3 select-none text-sm text-muted-foreground" aria-hidden>
					{currencySymbol}
				</span>
				<input
					{...props}
					ref={ref}
					type="text"
					inputMode="decimal"
					value={focused ? displayValue : formatter.format(value)}
					onFocus={handleFocus}
					onBlur={handleBlur}
					onChange={handleChange}
					onKeyDown={handleKeyDown}
					disabled={disabled}
					className={cn(
						"flex h-9 w-full rounded-md border border-input bg-transparent pl-7 pr-3 py-1 text-sm shadow-sm",
						"transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium",
						"placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
						"disabled:cursor-not-allowed disabled:opacity-50",
						"text-right tabular-nums"
					)}
					aria-label={props["aria-label"] ?? "monetary amount"}
				/>
			</div>
		)
	}
)

MoneyInput.displayName = "MoneyInput"
