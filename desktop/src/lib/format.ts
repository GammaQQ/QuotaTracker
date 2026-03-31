export function formatTokens(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
	return String(n)
}

export function formatCost(n: number): string {
	if (n >= 100) return `$${n.toFixed(0)}`
	if (n >= 1) return `$${n.toFixed(2)}`
	return `$${n.toFixed(3)}`
}

export function formatResetTime(seconds: number | null | undefined): string | null {
	if (seconds == null) return null
	const mins = Math.floor(seconds / 60)
	const hrs = Math.floor(mins / 60)
	const days = Math.floor(mins / 1440)
	if (days > 0) return `${days}d ${hrs % 24}h ${mins % 60}m`
	if (hrs > 0) return `${hrs}h ${mins % 60}m`
	return `${mins}m`
}

export function formatResetAt(iso: string | null | undefined): string | null {
	if (!iso) return null
	const d = new Date(iso)
	return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

export function barColor(util: number): string {
	if (util >= 0.9) return "#ef4444"
	if (util >= 0.7) return "#f97316"
	return "#22c55e"
}

export function paceLabel(headroom: number): string {
	if (headroom > 50) return "Plenty of room"
	if (headroom > 20) return "Watch your usage"
	if (headroom > 5) return "Running low"
	return "Almost exhausted"
}

export function paceColor(headroom: number): string {
	if (headroom > 50) return "#22c55e"
	if (headroom > 20) return "#eab308"
	return "#f97316"
}
