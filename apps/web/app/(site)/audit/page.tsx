import { redirect } from "next/navigation"

export default function AuditPageRedirect() {
	redirect("/auditor/audit-log")
}
