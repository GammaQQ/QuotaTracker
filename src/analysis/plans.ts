import type { PlanInfo } from "../types.ts"

const PLAN_NAMES: Record<string, string> = {
	"default_claude_ai": "Pro",
	"default_claude_max_5x": "Max 5x",
	"default_claude_max_20x": "Max 20x",
}

/** Map a rateLimitTier string to a PlanInfo. */
export function getPlanFromTier(tier: string): PlanInfo {
	const displayName = PLAN_NAMES[tier]
		?? (tier.replace("default_claude_", "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Unknown")

	return { tier, displayName }
}
