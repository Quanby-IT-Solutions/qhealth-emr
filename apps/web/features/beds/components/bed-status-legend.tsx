"use client"

interface StatusDef {
	key: string
	label: string
	dotClass: string
	textClass: string
}

const STATUSES: StatusDef[] = [
	{
		key: "available",
		label: "Available",
		dotClass: "bg-green-500",
		textClass: "text-green-700 dark:text-green-400",
	},
	{
		key: "occupied",
		label: "Occupied",
		dotClass: "bg-red-500",
		textClass: "text-red-700 dark:text-red-400",
	},
	{
		key: "reserved",
		label: "Reserved",
		dotClass: "bg-blue-500",
		textClass: "text-blue-700 dark:text-blue-400",
	},
	{
		key: "cleaning",
		label: "Cleaning",
		dotClass: "bg-orange-500",
		textClass: "text-orange-700 dark:text-orange-400",
	},
	{
		key: "out_of_service",
		label: "Out of Service",
		dotClass: "bg-yellow-500",
		textClass: "text-yellow-700 dark:text-yellow-400",
	},
	{
		key: "dirty",
		label: "Dirty / For Cleaning",
		dotClass: "bg-amber-500",
		textClass: "text-amber-700 dark:text-amber-400",
	},
]

export function BedStatusLegend() {
	return (
		<div className="flex flex-wrap items-center gap-x-5 gap-y-2">
			{STATUSES.map(s => (
				<div key={s.key} className="flex items-center gap-1.5">
					<span className={`size-2.5 rounded-full ${s.dotClass}`} />
					<span className={`text-xs font-medium ${s.textClass}`}>{s.label}</span>
				</div>
			))}
		</div>
	)
}
