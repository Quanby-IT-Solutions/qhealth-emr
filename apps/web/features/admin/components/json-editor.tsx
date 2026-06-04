"use client"

import { useCallback, useMemo, useState } from "react"

import { cn } from "@/core/lib/utils"

interface JsonEditorProps {
	"value": unknown
	"onChange"?: (next: unknown) => void
	"readOnly"?: boolean
	"rows"?: number
	"className"?: string
	"aria-label"?: string
}

export function JsonEditor({
	value,
	onChange,
	readOnly = false,
	rows = 12,
	className,
	...props
}: JsonEditorProps) {
	const initial = useMemo(() => safeStringify(value), [value])
	const [draft, setDraft] = useState(initial)
	const [error, setError] = useState<string | null>(null)

	const handleChange = useCallback(
		(raw: string) => {
			setDraft(raw)
			if (!onChange) return
			try {
				const parsed = raw.trim() === "" ? null : JSON.parse(raw)
				setError(null)
				onChange(parsed)
			} catch (err) {
				setError(err instanceof Error ? err.message : "Invalid JSON")
			}
		},
		[onChange]
	)

	return (
		<div className={cn("flex flex-col gap-1", className)}>
			<textarea
				value={draft}
				onChange={e => handleChange(e.target.value)}
				readOnly={readOnly}
				rows={rows}
				spellCheck={false}
				className={cn(
					"bg-muted/30 w-full resize-y rounded-md border p-2 font-mono text-xs",
					"focus:ring-ring focus:ring-1 focus:outline-none",
					readOnly && "cursor-default opacity-90"
				)}
				aria-invalid={!!error}
				aria-label={props["aria-label"] ?? "JSON editor"}
			/>
			{error && (
				<p className="text-destructive text-xs" role="alert">
					{error}
				</p>
			)}
		</div>
	)
}

function safeStringify(value: unknown): string {
	if (value == null) return ""
	try {
		return JSON.stringify(value, null, 2)
	} catch {
		return String(value)
	}
}
