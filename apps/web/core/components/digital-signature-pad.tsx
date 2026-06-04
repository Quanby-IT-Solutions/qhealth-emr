"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { cn } from "@/core/lib/utils"

import { Button } from "./ui/button"

interface DigitalSignaturePadProps {
	onSave: (dataUrl: string) => void
	onClear?: () => void
	width?: number
	height?: number
	className?: string
	disabled?: boolean
}

export function DigitalSignaturePad({
	onSave,
	onClear,
	width = 400,
	height = 200,
	className,
	disabled = false,
}: DigitalSignaturePadProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const isDrawingRef = useRef(false)
	const [isEmpty, setIsEmpty] = useState(true)

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		const ctx = canvas.getContext("2d")
		if (!ctx) return
		ctx.strokeStyle = "#1a1a1a"
		ctx.lineWidth = 2
		ctx.lineCap = "round"
		ctx.lineJoin = "round"
	}, [])

	const getPos = (
		e: MouseEvent | TouchEvent,
		canvas: HTMLCanvasElement
	): { x: number; y: number } => {
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

	const startDrawing = useCallback(
		(e: MouseEvent | TouchEvent) => {
			if (disabled) return
			const canvas = canvasRef.current
			if (!canvas) return
			const ctx = canvas.getContext("2d")
			if (!ctx) return
			isDrawingRef.current = true
			const { x, y } = getPos(e, canvas)
			ctx.beginPath()
			ctx.moveTo(x, y)
			setIsEmpty(false)
		},
		[disabled]
	)

	const draw = useCallback((e: MouseEvent | TouchEvent) => {
		if (!isDrawingRef.current) return
		const canvas = canvasRef.current
		if (!canvas) return
		const ctx = canvas.getContext("2d")
		if (!ctx) return
		e.preventDefault()
		const { x, y } = getPos(e, canvas)
		ctx.lineTo(x, y)
		ctx.stroke()
	}, [])

	const stopDrawing = useCallback(() => {
		isDrawingRef.current = false
	}, [])

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return

		canvas.addEventListener("mousedown", startDrawing)
		canvas.addEventListener("mousemove", draw)
		canvas.addEventListener("mouseup", stopDrawing)
		canvas.addEventListener("mouseleave", stopDrawing)
		canvas.addEventListener("touchstart", startDrawing, { passive: false })
		canvas.addEventListener("touchmove", draw, { passive: false })
		canvas.addEventListener("touchend", stopDrawing)

		return () => {
			canvas.removeEventListener("mousedown", startDrawing)
			canvas.removeEventListener("mousemove", draw)
			canvas.removeEventListener("mouseup", stopDrawing)
			canvas.removeEventListener("mouseleave", stopDrawing)
			canvas.removeEventListener("touchstart", startDrawing)
			canvas.removeEventListener("touchmove", draw)
			canvas.removeEventListener("touchend", stopDrawing)
		}
	}, [startDrawing, draw, stopDrawing])

	const handleClear = () => {
		const canvas = canvasRef.current
		if (!canvas) return
		const ctx = canvas.getContext("2d")
		if (!ctx) return
		ctx.clearRect(0, 0, canvas.width, canvas.height)
		setIsEmpty(true)
		onClear?.()
	}

	const handleSave = () => {
		const canvas = canvasRef.current
		if (!canvas || isEmpty) return
		const dataUrl = canvas.toDataURL("image/png")
		onSave(dataUrl)
	}

	return (
		<div className={cn("flex flex-col gap-3", className)}>
			<div className="border-input overflow-hidden rounded-md border bg-white">
				<canvas
					ref={canvasRef}
					width={width}
					height={height}
					className={cn("block w-full", disabled && "pointer-events-none opacity-50")}
					aria-label="Signature pad"
				/>
			</div>
			{!disabled && (
				<div className="flex items-center justify-between gap-2">
					<p className="text-muted-foreground text-xs">Sign using your mouse or touch</p>
					<div className="flex gap-2">
						<Button variant="outline" size="sm" onClick={handleClear} type="button">
							Clear
						</Button>
						<Button size="sm" onClick={handleSave} disabled={isEmpty} type="button">
							Save Signature
						</Button>
					</div>
				</div>
			)}
		</div>
	)
}
