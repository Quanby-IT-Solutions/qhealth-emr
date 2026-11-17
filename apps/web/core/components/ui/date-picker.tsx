"use client"

import * as React from "react"
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, X } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Calendar } from "@/core/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover"
import { cn } from "@/core/lib/utils"

function parseIsoDate(value: string) {
	if (!value) return undefined
	const [year, month, day] = value.split("-").map(Number)
	if (!year || !month || !day) return undefined
	return new Date(year, month - 1, day)
}

function toIsoDate(date: Date) {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, "0")
	const day = String(date.getDate()).padStart(2, "0")
	return `${year}-${month}-${day}`
}

function formatDisplayDate(value: string) {
	const date = parseIsoDate(value)
	if (!date) return ""
	return date.toLocaleDateString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
	})
}

type DatePickerView = "dates" | "months" | "years"

const monthLabelFormatter = new Intl.DateTimeFormat("en-PH", { month: "short" })
const monthPickerFormatter = new Intl.DateTimeFormat("en-PH", { month: "short" })

function startOfMonth(date: Date) {
	return new Date(date.getFullYear(), date.getMonth(), 1)
}

function clampMonth(date: Date, startMonth: Date, endMonth: Date) {
	const month = startOfMonth(date)
	if (month < startMonth) return startMonth
	if (month > endMonth) return endMonth
	return month
}

function addMonths(date: Date, months: number) {
	return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

function addYears(date: Date, years: number) {
	return new Date(date.getFullYear() + years, date.getMonth(), 1)
}

function isSameMonth(a: Date | undefined, b: Date) {
	return Boolean(a && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth())
}

function getYearRange(startYear: number, endYear: number) {
	const firstYear = Math.min(startYear, endYear)
	const lastYear = Math.max(startYear, endYear)

	return Array.from({ length: lastYear - firstYear + 1 }, (_, index) => lastYear - index)
}

interface DatePickerBaseProps {
	id?: string
	value: string
	onChange: (value: string) => void
	placeholder?: string
	className?: string
	disabled?: boolean
	required?: boolean
	startYear?: number
	endYear?: number
}

type DatePickerProps = DatePickerBaseProps & { "aria-invalid"?: boolean }

function DatePicker({
	id,
	value,
	onChange,
	placeholder = "Select date",
	className,
	disabled,
	required,
	startYear = 1900,
	endYear = new Date().getFullYear() + 10,
	"aria-invalid": ariaInvalid,
}: DatePickerProps) {
	const [open, setOpen] = React.useState(false)
	const selectedDate = React.useMemo(() => parseIsoDate(value), [value])
	const startMonth = React.useMemo(() => new Date(startYear, 0), [startYear])
	const endMonth = React.useMemo(() => new Date(endYear, 11), [endYear])
	const [pickerView, setPickerView] = React.useState<DatePickerView>("dates")
	const [visibleMonth, setVisibleMonth] = React.useState(() =>
		clampMonth(selectedDate ?? new Date(), startMonth, endMonth)
	)

	React.useEffect(() => {
		if (!open) return

		const nextVisibleMonth = clampMonth(selectedDate ?? new Date(), startMonth, endMonth)
		setVisibleMonth(nextVisibleMonth)
		setPickerView("dates")
	}, [endMonth, open, selectedDate, startMonth])

	return (
		<div className="flex gap-2">
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger
					render={
						<Button
							id={id}
							type="button"
							variant="outline"
							disabled={disabled}
							aria-invalid={ariaInvalid}
							aria-required={required}
							className={cn(
								"w-full justify-start text-left font-normal",
								!value && "text-muted-foreground",
								className
							)}
						/>
					}
				>
					<CalendarIcon className="mr-2 size-4" />
					{value ? formatDisplayDate(value) : placeholder}
				</PopoverTrigger>
				<PopoverContent align="start" className="w-auto rounded-2xl p-0">
					<DatePickerCalendar
						view={pickerView}
						onViewChange={setPickerView}
						visibleMonth={visibleMonth}
						onVisibleMonthChange={setVisibleMonth}
						selected={selectedDate}
						startMonth={startMonth}
						endMonth={endMonth}
						onSelect={date => {
							onChange(date ? toIsoDate(date) : "")
							setOpen(false)
						}}
					/>
				</PopoverContent>
			</Popover>
			{value && !required ? (
				<Button
					type="button"
					variant="ghost"
					size="icon"
					disabled={disabled}
					aria-label="Clear date"
					onClick={() => onChange("")}
				>
					<X className="size-4" />
				</Button>
			) : null}
		</div>
	)
}

interface DatePickerCalendarProps {
	view: DatePickerView
	onViewChange: React.Dispatch<React.SetStateAction<DatePickerView>>
	visibleMonth: Date
	onVisibleMonthChange: React.Dispatch<React.SetStateAction<Date>>
	selected: Date | undefined
	startMonth: Date
	endMonth: Date
	onSelect: (date: Date | undefined) => void
}

function DatePickerCalendar({
	view,
	onViewChange,
	visibleMonth,
	onVisibleMonthChange,
	selected,
	startMonth,
	endMonth,
	onSelect,
}: DatePickerCalendarProps) {
	const visibleYear = visibleMonth.getFullYear()
	const visibleMonthIndex = visibleMonth.getMonth()
	const monthLabel = monthLabelFormatter.format(visibleMonth)
	const startYear = startMonth.getFullYear()
	const endYear = endMonth.getFullYear()
	const years = React.useMemo(() => getYearRange(startYear, endYear), [endYear, startYear])
	const yearListRef = React.useRef<HTMLDivElement | null>(null)
	const showStepButtons = view !== "years"
	const canGoPrevious =
		view === "years"
			? false
			: view === "months"
				? visibleYear > startYear
				: visibleMonth > startMonth
	const canGoNext =
		view === "years" ? false : view === "months" ? visibleYear < endYear : visibleMonth < endMonth

	React.useEffect(() => {
		if (view !== "years") return

		yearListRef.current
			?.querySelector<HTMLButtonElement>("[data-active-year='true']")
			?.scrollIntoView({ block: "center" })
	}, [view, visibleYear])

	function showMonths() {
		onViewChange(view === "months" ? "dates" : "months")
	}

	function showYears() {
		onViewChange(view === "years" ? "dates" : "years")
	}

	function goPrevious() {
		if (view === "months") {
			onVisibleMonthChange(month => clampMonth(addYears(month, -1), startMonth, endMonth))
			return
		}

		onVisibleMonthChange(month => clampMonth(addMonths(month, -1), startMonth, endMonth))
	}

	function goNext() {
		if (view === "months") {
			onVisibleMonthChange(month => clampMonth(addYears(month, 1), startMonth, endMonth))
			return
		}

		onVisibleMonthChange(month => clampMonth(addMonths(month, 1), startMonth, endMonth))
	}

	function selectMonth(monthIndex: number) {
		onVisibleMonthChange(clampMonth(new Date(visibleYear, monthIndex, 1), startMonth, endMonth))
		onViewChange("dates")
	}

	function selectYear(year: number) {
		onVisibleMonthChange(clampMonth(new Date(year, visibleMonthIndex, 1), startMonth, endMonth))
		onViewChange("dates")
	}

	return (
		<div className="bg-popover w-72 rounded-2xl p-3">
			<div className="mb-3 flex items-center justify-between gap-2">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className={cn("rounded-full", !showStepButtons && "invisible")}
					disabled={!canGoPrevious}
					aria-label="Previous"
					onClick={goPrevious}
				>
					<ChevronLeftIcon className="size-4" />
				</Button>
				<div className="bg-muted/60 flex rounded-full p-1">
					<Button
						type="button"
						variant={view === "months" ? "secondary" : "ghost"}
						size="sm"
						className="h-7 rounded-full px-3"
						onClick={showMonths}
					>
						{monthLabel}
					</Button>
					<Button
						type="button"
						variant={view === "years" ? "secondary" : "ghost"}
						size="sm"
						className="h-7 rounded-full px-3"
						onClick={showYears}
					>
						{visibleYear}
					</Button>
				</div>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className={cn("rounded-full", !showStepButtons && "invisible")}
					disabled={!canGoNext}
					aria-label="Next"
					onClick={goNext}
				>
					<ChevronRightIcon className="size-4" />
				</Button>
			</div>

			{view === "months" ? (
				<div className="grid grid-cols-3 gap-2">
					{Array.from({ length: 12 }, (_, monthIndex) => {
						const month = new Date(visibleYear, monthIndex, 1)
						const disabled = month < startMonth || month > endMonth
						const selectedMonth = isSameMonth(selected, month)
						const currentMonth = visibleMonthIndex === monthIndex

						return (
							<Button
								key={monthIndex}
								type="button"
								variant={selectedMonth || currentMonth ? "default" : "ghost"}
								className="h-10 rounded-2xl"
								disabled={disabled}
								onClick={() => selectMonth(monthIndex)}
							>
								{monthPickerFormatter.format(month)}
							</Button>
						)
					})}
				</div>
			) : view === "years" ? (
				<div
					ref={yearListRef}
					className="max-h-60 [scrollbar-width:none] overflow-y-auto pr-1 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
				>
					<div className="grid grid-cols-3 gap-2">
						{years.map(year => {
							const disabled = year < startYear || year > endYear
							const selectedYear = selected?.getFullYear() === year
							const currentYear = visibleYear === year

							return (
								<Button
									key={year}
									type="button"
									variant={selectedYear || currentYear ? "default" : "ghost"}
									className="h-10 rounded-2xl"
									data-active-year={currentYear ? "true" : undefined}
									disabled={disabled}
									onClick={() => selectYear(year)}
								>
									{year}
								</Button>
							)
						})}
					</div>
				</div>
			) : (
				<Calendar
					mode="single"
					captionLayout="label"
					hideNavigation
					month={visibleMonth}
					onMonthChange={month => onVisibleMonthChange(clampMonth(month, startMonth, endMonth))}
					startMonth={startMonth}
					endMonth={endMonth}
					selected={selected}
					onSelect={onSelect}
					className="w-full p-0"
					classNames={{
						root: "w-full",
						months: "flex w-full",
						month: "flex w-full flex-col gap-2",
						month_caption: "sr-only",
					}}
				/>
			)}
		</div>
	)
}

export { DatePicker }
