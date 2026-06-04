"use client"

import { motion } from "framer-motion"

import { Button } from "@/core/components/ui/button"
import { Field } from "@/core/components/ui/field"
import { authClient } from "@/services/better-auth/auth-client"

import { AppleIcon, GoogleIcon } from "./social-icons"

interface SocialLoginButtonsProps {
	action?: "login" | "signup"
	onAppleClick?: () => void
	onGoogleClick?: () => void
	onSsoClick?: () => void
}

export function SocialLoginButtons({
	action = "login",
	onAppleClick,
	onGoogleClick,
	onSsoClick,
}: SocialLoginButtonsProps) {
	const actionText = action === "login" ? "Login" : "Sign up"

	const handleGoogleClick = async () => {
		await authClient.signIn.social({
			provider: "google",
		})
	}

	return (
		<Field className="grid grid-cols-1 gap-3 md:grid-cols-3">
			<motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
				<Button
					variant="outline"
					type="button"
					onClick={onSsoClick}
					className="border-border hover:bg-muted/50 w-full bg-transparent font-sans hover:cursor-pointer"
				>
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="mr-2"
					>
						<rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
						<path d="M9 22v-4h6v4" />
						<path d="M8 6h.01" />
						<path d="M16 6h.01" />
						<path d="M12 6h.01" />
						<path d="M12 10h.01" />
						<path d="M12 14h.01" />
						<path d="M16 10h.01" />
						<path d="M16 14h.01" />
						<path d="M8 10h.01" />
						<path d="M8 14h.01" />
					</svg>
					<span className="md:sr-only lg:not-sr-only">Hospital SSO</span>
				</Button>
			</motion.div>

			<motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
				<Button
					variant="outline"
					type="button"
					onClick={onGoogleClick ?? handleGoogleClick}
					className="border-border hover:bg-muted/50 w-full bg-transparent font-sans hover:cursor-pointer"
				>
					<GoogleIcon />
					<span className="ml-2 md:sr-only lg:not-sr-only">{actionText} with Google</span>
				</Button>
			</motion.div>

			<motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
				<Button
					variant="outline"
					type="button"
					onClick={onAppleClick}
					className="border-border hover:bg-muted/50 w-full bg-transparent font-sans hover:cursor-pointer"
				>
					<AppleIcon />
					<span className="ml-2 md:sr-only lg:not-sr-only">{actionText} with Apple</span>
				</Button>
			</motion.div>
		</Field>
	)
}
