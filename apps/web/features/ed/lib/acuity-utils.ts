export function acuityColor(level: number | null): string {
	switch (level) {
		case 1:
			return "bg-red-600 text-white"
		case 2:
			return "bg-orange-500 text-white"
		case 3:
			return "bg-yellow-500 text-black"
		case 4:
			return "bg-green-500 text-white"
		case 5:
			return "bg-blue-500 text-white"
		default:
			return "bg-gray-300 text-gray-700"
	}
}

export function acuityLabel(level: number | null): string {
	switch (level) {
		case 1:
			return "Resuscitation"
		case 2:
			return "Emergent"
		case 3:
			return "Urgent"
		case 4:
			return "Less Urgent"
		case 5:
			return "Non-Urgent"
		default:
			return "—"
	}
}
