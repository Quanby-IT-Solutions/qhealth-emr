import type { Metadata } from "next"
import { Fraunces, Geist, Geist_Mono } from "next/font/google"

import { BreakpointIndicator } from "@/core/components/breakpoint-indicator"
import { Toaster } from "@/core/components/ui/sonner"
import { ThemeProvider } from "@/core/context/theme-provider"
import { AuthProvider } from "@/services/better-auth/context/auth-provider"
import { QueryProvider } from "@/services/tanstack-query/provider"
import { OfflineServiceWorkerRegistrar } from "@/features/offline-cache/components/offline-service-worker-registrar"

import "@/core/styles/globals.css"
import "@/services/orpc/orpc-server"

const fraunces = Fraunces({
	subsets: ["latin"],
	variable: "--font-serif",
	display: "swap",
})

const geistSans = Geist({
	variable: "--font-sans",
	subsets: ["latin"],
	display: "swap",
})

const geistMono = Geist_Mono({
	variable: "--font-mono",
	subsets: ["latin"],
	display: "swap",
})

export const metadata: Metadata = {
	title: "Peregrine",
	description: "Peregrine Eye and Laser Institute clinical records system",
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html
			lang="en"
			className={`${fraunces.variable} ${geistSans.variable} ${geistMono.variable}`}
			suppressHydrationWarning
		>
			<body className="font-sans antialiased">
				<AuthProvider>
					<QueryProvider>
						<ThemeProvider
							attribute="class"
							defaultTheme="system"
							enableSystem
							disableTransitionOnChange
						>
							<BreakpointIndicator />
							<OfflineServiceWorkerRegistrar />
							{children}
							<Toaster richColors closeButton />
						</ThemeProvider>
					</QueryProvider>
				</AuthProvider>
			</body>
		</html>
	)
}
