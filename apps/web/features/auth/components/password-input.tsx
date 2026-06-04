"use client"

import * as React from "react"
import { motion } from "framer-motion"

import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { cn } from "@/core/lib/utils"

interface PasswordInputProps extends React.ComponentProps<typeof Input> {}

export function PasswordInput({ className, ...props }: PasswordInputProps) {
	const [showPassword, setShowPassword] = React.useState(false)

	return (
		<div className={cn("group relative", className)}>
			<div className="text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 -translate-y-1/2 transition-colors">
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
					<path d="M7 11V7a5 5 0 0 1 10 0v4" />
				</svg>
			</div>
			<Input
				{...props}
				type={showPassword ? "text" : "password"}
				className="focus-visible:ring-ring focus-visible:border-ring pr-9 pl-9 shadow-sm transition-all focus-visible:ring-1"
			/>
			<motion.div
				whileHover={{ scale: 1.1 }}
				whileTap={{ scale: 0.9 }}
				className="absolute top-0 right-0 h-full"
			>
				<Button
					type="button"
					variant="ghost"
					onClick={() => setShowPassword(!showPassword)}
					aria-label={showPassword ? "Hide password" : "Show password"}
					className="text-muted-foreground hover:text-foreground h-full px-3 hover:bg-transparent"
					tabIndex={-1}
				>
					<div className="relative flex h-4 w-4 items-center justify-center">
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
							<circle cx="12" cy="12" r="3" />
						</svg>
						<motion.svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							className="absolute inset-0"
							initial={false}
							animate={{ opacity: showPassword ? 0 : 1 }}
							transition={{ duration: 0.2 }}
						>
							<motion.line
								x1="2"
								y1="2"
								x2="22"
								y2="22"
								initial={false}
								animate={{ pathLength: showPassword ? 0 : 1 }}
								transition={{ duration: 0.2, ease: "easeInOut" }}
							/>
						</motion.svg>
					</div>
				</Button>
			</motion.div>
		</div>
	)
}
