"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { RotateCcw } from "lucide-react"

import { Button } from "@/core/components/ui/button"

interface SignatureCanvasProps {
	label?: string
	onChange?: (dataUrl: string | null) => void
	disabled?: boolean
}

export function SignatureCanvas({
	label = "Signature",
	onChange,
	disabled,
}: SignatureCanvasProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const isDrawingRef = useRef(false)
	const lastPosRef = useRef<{ x: number; y: number } | null>(null)
	const hasStrokesRef = useRef(false)

	const getPos = (
		e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
	): { x: number; y: number } => {
		const canvas = canvasRef.current!
		const rect = canvas.getBoundingClientRect()
		const scaleX = canvas.width / rect.width
		const scaleY = canvas.height / rect.height

		if ("touches" in e) {
			const touch = e.touches[0]
			if (!touch) return { x: 0, y: 0 }
			return {
				x: (touch.clientX - rect.left) * scaleX,
				y: (touch.clientY - rect.top) * scaleY,
			}
		}
		return {
			x: (e.clientX - rect.left) * scaleX,
			y: (e.clientY - rect.top) * scaleY,
		}
	}

	const startDrawing = (
		e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
	) => {
		if (disabled) return
		e.preventDefault()
		isDrawingRef.current = true
		lastPosRef.current = getPos(e)
	}

	const draw = (
		e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
	) => {
		if (disabled) return
		e.preventDefault()
		if (!isDrawingRef.current) return
		const canvas = canvasRef.current
		const ctx = canvas?.getContext("2d")
		if (!canvas || !ctx || !lastPosRef.current) return

		const pos = getPos(e)
		ctx.beginPath()
		ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
		ctx.lineTo(pos.x, pos.y)
		ctx.strokeStyle = "#111827"
		ctx.lineWidth = 2
		ctx.lineCap = "round"
		ctx.lineJoin = "round"
		ctx.stroke()
		lastPosRef.current = pos
		hasStrokesRef.current = true
	}

	const stopDrawing = (
		e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
	) => {
		if (!isDrawingRef.current) return
		e.preventDefault()
		isDrawingRef.current = false
		lastPosRef.current = null

		if (hasStrokesRef.current && canvasRef.current) {
			onChange?.(canvasRef.current.toDataURL("image/png"))
		}
	}

	const handleClear = useCallback(() => {
		const canvas = canvasRef.current
		const ctx = canvas?.getContext("2d")
		if (!canvas || !ctx) return
		ctx.clearRect(0, 0, canvas.width, canvas.height)
		ctx.fillStyle = "#ffffff"
		ctx.fillRect(0, 0, canvas.width, canvas.height)
		hasStrokesRef.current = false
		onChange?.(null)
	}, [onChange])

	useEffect(() => {
		const canvas = canvasRef.current
		const ctx = canvas?.getContext("2d")
		if (!canvas || !ctx) return
		ctx.fillStyle = "#ffffff"
		ctx.fillRect(0, 0, canvas.width, canvas.height)
	}, [])

	return (
		<div className="space-y-2">
			<p className="text-sm font-medium">{label}</p>
			<div className="relative overflow-hidden rounded-md border bg-white">
				<canvas
					ref={canvasRef}
					width={600}
					height={150}
					className="block w-full touch-none"
					style={{
						cursor: disabled ? "not-allowed" : "crosshair",
						opacity: disabled ? 0.6 : 1,
					}}
					onMouseDown={startDrawing}
					onMouseMove={draw}
					onMouseUp={stopDrawing}
					onMouseLeave={stopDrawing}
					onTouchStart={startDrawing}
					onTouchMove={draw}
					onTouchEnd={stopDrawing}
				/>
				<div className="pointer-events-none absolute bottom-2 left-0 right-0 flex justify-center">
					<div className="h-px w-3/4 border-b border-dashed border-gray-300" />
				</div>
				{disabled && (
					<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
						<span className="text-xs text-muted-foreground">Signature locked</span>
					</div>
				)}
			</div>
			{!disabled && (
				<Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={handleClear}>
					<RotateCcw className="size-3.5" />
					Clear
				</Button>
			)}
		</div>
	)
}
