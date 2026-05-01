import { redirect } from "next/navigation"

// /admin/users/roles → /admin/roles (canonical route for Role & Permission Configuration)
export default function UsersRolesPage() {
	redirect("/admin/roles")
}
