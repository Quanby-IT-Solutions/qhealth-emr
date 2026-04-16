import { DevQuickLogin } from "@/features/auth/components/dev-quick-login"
import { LoginForm } from "@/features/auth/login/components/login-form"

export default function LoginPage() {
	return (
		<section className="flex flex-1 flex-col items-center justify-center gap-4">
			<LoginForm className="w-full" />
			<DevQuickLogin />
		</section>
	)
}
