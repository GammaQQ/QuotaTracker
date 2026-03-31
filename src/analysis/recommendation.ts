import type { OAuthData, Recommendation } from "../types.ts"
import type { HistorySample } from "../types.ts"
import { estimateRunway } from "./history.ts"

/** Determine the best AI tool to use right now based on usage headroom. */
export function getRecommendation(
	oauth: OAuthData | null,
	historySamples: HistorySample[],
): Recommendation {
	if (!oauth) {
		return {
			bestTool: "Claude Code",
			reason: "No OAuth data available — usage limits unknown",
			sessionHeadroomPercent: 100,
			weeklyHeadroomPercent: 100,
			estimatedRunway: null,
		}
	}

	// utilization is 0.0–1.0, convert to percentage for display
	const sessionPct = oauth.fiveHour.utilization * 100
	const weeklyPct = oauth.sevenDay.utilization * 100
	const sessionHeadroom = Math.max(0, 100 - sessionPct)
	const weeklyHeadroom = Math.max(0, 100 - weeklyPct)

	const runway = estimateRunway(historySamples, oauth.fiveHour.utilization)

	// Determine best tool based on headroom
	let bestTool: string
	let reason: string

	if (sessionHeadroom < 5) {
		// Session nearly full — suggest waiting or switching
		const resetsIn = oauth.fiveHour.remainingSeconds
		if (resetsIn != null && resetsIn < 1800) {
			bestTool = "Wait"
			reason = `Session resets in ${Math.ceil(resetsIn / 60)}m — save remaining capacity`
		} else {
			bestTool = "Codex"
			reason = `Claude Code session at ${sessionPct.toFixed(0)}% — switch to Codex while it resets`
		}
	} else if (weeklyHeadroom < 10) {
		bestTool = "Codex"
		reason = `Weekly limit at ${weeklyPct.toFixed(0)}% — conserve Claude Code usage`
	} else if (sessionHeadroom > 50 && weeklyHeadroom > 50) {
		bestTool = "Claude Code"
		reason = `Plenty of headroom — session ${sessionPct.toFixed(0)}%, weekly ${weeklyPct.toFixed(0)}%`
	} else {
		bestTool = "Claude Code"
		reason = runway
			? `~${sessionHeadroom.toFixed(0)}% session remaining (${runway} to limit)`
			: `~${sessionHeadroom.toFixed(0)}% session remaining`
	}

	return {
		bestTool,
		reason,
		sessionHeadroomPercent: sessionHeadroom,
		weeklyHeadroomPercent: weeklyHeadroom,
		estimatedRunway: runway,
	}
}
