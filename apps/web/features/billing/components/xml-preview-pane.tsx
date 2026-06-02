"use client"

import { useCallback, useMemo, useRef, useState } from "react"

import { Button } from "@/core/components/ui/button"
import { cn } from "@/core/lib/utils"

const COLLAPSE_THRESHOLD = 50

interface XmlPreviewPaneProps {
	xml: string
	className?: string
	title?: string
}

function highlightXml(line: string): string {
	return line
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(
			/(&lt;\/?)([A-Za-z][A-Za-z0-9:.-]*)([^&]*?)(&gt;)/g,
			'$1<span class="text-blue-600 dark:text-blue-400">$2</span>$3$4'
		)
		.replace(
			/\s([A-Za-z][A-Za-z0-9:.-]*)=/g,
			' <span class="text-amber-600 dark:text-amber-400">$1</span>='
		)
		.replace(
			/"([^"]*)"/g,
			'"<span class="text-green-600 dark:text-green-400">$1</span>"'
		)
}

export function XmlPreviewPane({ xml, className, title = "XML Preview" }: XmlPreviewPaneProps) {
	const [search, setSearch] = useState("")
	const [expanded, setExpanded] = useState(false)
	const [copied, setCopied] = useState(false)
	const inputRef = useRef<HTMLInputElement>(null)

	const lines = useMemo(() => xml.split("\n"), [xml])
	const visibleLines = expanded || lines.length <= COLLAPSE_THRESHOLD ? lines : lines.slice(0, COLLAPSE_THRESHOLD)

	const filteredLines = useMemo(() => {
		if (!search.trim()) return visibleLines
		const term = search.toLowerCase()
		return visibleLines.filter(l => l.toLowerCase().includes(term))
	}, [visibleLines, search])

	const handleCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(xml)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch {
			// fallback: noop
		}
	}, [xml])

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "f") {
				e.preventDefault()
				inputRef.current?.focus()
			}
		},
		[]
	)

	return (
		<div
			className={cn("flex flex-col rounded-md border bg-muted/30", className)}
			onKeyDown={handleKeyDown}
			role="region"
			aria-label={title}
		>
			{/* Toolbar */}
			<div className="flex items-center gap-2 border-b px-3 py-2">
				<span className="text-xs font-medium text-muted-foreground flex-1">{title}</span>
				<input
					ref={inputRef}
					type="search"
					value={search}
					onChange={e => setSearch(e.target.value)}
					placeholder="Search… (Ctrl+F)"
					className={cn(
						"h-6 w-36 rounded border bg-background px-2 text-xs outline-none",
						"focus:ring-1 focus:ring-ring"
					)}
					aria-label="Search XML content"
				/>
				<Button
					variant="ghost"
					size="sm"
					className="h-6 px-2 text-xs"
					onClick={handleCopy}
					aria-label="Copy XML to clipboard"
				>
					{copied ? "Copied!" : "Copy"}
				</Button>
			</div>

			{/* Code content */}
			<div className="overflow-auto">
				<pre
					className="px-3 py-2 font-mono text-xs leading-relaxed text-foreground"
					aria-label="XML content"
				>
					{filteredLines.map((line, idx) => (
						<div
							key={idx}
							className={cn(
								search.trim() && line.toLowerCase().includes(search.toLowerCase())
									? "bg-yellow-100/60 dark:bg-yellow-900/30"
									: ""
							)}
							dangerouslySetInnerHTML={{ __html: highlightXml(line) }}
						/>
					))}
				</pre>
			</div>

			{/* Expand / collapse */}
			{lines.length > COLLAPSE_THRESHOLD && (
				<div className="border-t px-3 py-2 text-center">
					<button
						type="button"
						className="text-xs text-muted-foreground hover:text-foreground underline"
						onClick={() => setExpanded(v => !v)}
						aria-expanded={expanded}
					>
						{expanded
							? "Show less"
							: `Show all ${lines.length} lines (${lines.length - COLLAPSE_THRESHOLD} hidden)`}
					</button>
				</div>
			)}
		</div>
	)
}
