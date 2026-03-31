import type { UsageOutput, DataError, UsageData, AnalysisData } from "./types.ts"
import { fetchOAuthData } from "./oauth/client.ts"
import { loadDailyUsage, loadMonthlyUsage, loadEntries, calculateTotals } from "./jsonl/loader.ts"
import { toSessionBlockSummaries } from "./jsonl/session-blocks.ts"
import { readHistory, readHeatmap, appendHistory, updateHeatmap, computeVelocity } from "./analysis/history.ts"
import { getRecommendation } from "./analysis/recommendation.ts"
import { computeEstimates } from "./analysis/estimates.ts"

const VERSION = "0.1.0"

/** Collect all usage data in parallel and assemble the output JSON. */
export async function gather(): Promise<UsageOutput> {
	const errors: DataError[] = []

	// Run OAuth and JSONL loading in parallel
	const [oauthResult, dailyResult, monthlyResult, entriesResult] = await Promise.allSettled([
		fetchOAuthData(),
		loadDailyUsage(),
		loadMonthlyUsage(),
		loadEntries(),
	])

	// OAuth data
	const oauth = oauthResult.status === "fulfilled" ? oauthResult.value : null
	if (oauthResult.status === "rejected") {
		errors.push({ source: "oauth", message: String(oauthResult.reason) })
	}

	// Daily summaries
	const daily = dailyResult.status === "fulfilled" ? dailyResult.value : []
	if (dailyResult.status === "rejected") {
		errors.push({ source: "jsonl", message: `Daily: ${oauthResult.status === "rejected" ? oauthResult.reason : "unknown"}` })
	}

	// Monthly summaries
	const monthly = monthlyResult.status === "fulfilled" ? monthlyResult.value : []
	if (monthlyResult.status === "rejected") {
		errors.push({ source: "jsonl", message: `Monthly: ${monthlyResult.reason}` })
	}

	// Entries for session blocks and totals
	const entries = entriesResult.status === "fulfilled" ? entriesResult.value : []
	if (entriesResult.status === "rejected") {
		errors.push({ source: "jsonl", message: `Entries: ${entriesResult.reason}` })
	}

	const { blocks, activeBlock } = toSessionBlockSummaries(entries)
	const { totals, modelBreakdowns } = calculateTotals(entries)

	const usage: UsageData = {
		daily,
		monthly,
		sessionBlocks: blocks,
		activeBlock,
		totals,
		modelBreakdowns,
	}

	// History & heatmap
	let historySamples = readHistory()
	let heatmap = readHeatmap()

	// Update history with current OAuth data
	if (oauth) {
		try {
			appendHistory(oauth.fiveHour.utilization, oauth.sevenDay.utilization)
			updateHeatmap(oauth.fiveHour.utilization, oauth.sevenDay.utilization)
			historySamples = readHistory()
			heatmap = readHeatmap()
		} catch (err) {
			errors.push({ source: "history", message: String(err) })
		}
	}

	const velocity = computeVelocity(historySamples)
	const recommendation = getRecommendation(oauth, historySamples)

	// Compute limit estimates
	let sessionCost = 0
	if (oauth?.fiveHour.resetsAt) {
		const resetDate = new Date(oauth.fiveHour.resetsAt)
		const windowStart = new Date(resetDate.getTime() - 5 * 3_600_000)
		const startISO = windowStart.toISOString()
		sessionCost = blocks
			.filter((b) => b.endTime > startISO && b.startTime < oauth.fiveHour.resetsAt!)
			.reduce((sum, b) => sum + b.costUSD, 0)
	}
	let weeklyCost = 0
	if (oauth?.sevenDay.resetsAt) {
		const resetDate = new Date(oauth.sevenDay.resetsAt)
		const windowStart = new Date(resetDate.getTime() - 7 * 86_400_000)
		const cutoff = windowStart.toISOString().slice(0, 10)
		weeklyCost = daily.filter((d) => d.date >= cutoff).reduce((sum, d) => sum + d.totalCost, 0)
	}
	const estimates = computeEstimates(oauth, sessionCost, weeklyCost)

	const analysis: AnalysisData = {
		recommendation,
		history: { samples: historySamples, velocity },
		heatmap,
		estimates,
	}

	return {
		timestamp: new Date().toISOString(),
		version: VERSION,
		oauth,
		usage,
		analysis,
		errors,
	}
}
