export default function AuthLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<main className="bg-background relative flex min-h-screen flex-col">
			{children}
		</main>
	)
}
