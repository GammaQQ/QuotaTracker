import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { getStateDir } from "../utils/paths.ts"
import type { HistorySample, HeatmapData } from "../types.ts"

const HISTORY_MAX_AGE = 86_400 // 24 hours in seconds
const HISTORY_MAX_ENTRIES = 2_000
const HEATMAP_MAX_DAYS = 28

function getHistoryPath(): string {
	return join(getStateDir(), "history.json")
}

function getHeatmapPath(): string {
	return join(getStateDir(), "heatmap.json")
}

function ensureStateDir(): void {
	mkdirSync(getStateDir(), { recursive: true })
}

/** Read usage history samples from disk. */
export function readHistory(): HistorySample[] {
	try {
		const raw = readFileSync(getHistoryPath(), "utf-8")
		return JSON.parse(raw) as HistorySample[]
	} catch {
		return []
	}
}

/** Append a usage sample to history and prune old entries. */
export function appendHistory(sessionPct: number, weeklyPct: number): void {
	const samples = readHistory()
	const now = Date.now() / 1000

	samples.push({ t: now, s: sessionPct, w: weeklyPct })

	// Prune entries older than 24h and cap count
	const cutoff = now - HISTORY_MAX_AGE
	const pruned = samples
		.filter((s) => s.t > cutoff)
		.slice(-HISTORY_MAX_ENTRIES)

	try {
		ensureStateDir()
		writeFileSync(getHistoryPath(), JSON.stringify(pruned))
	} catch {
		// Non-fatal
	}
}

/** Read heatmap data from disk. */
export function readHeatmap(): HeatmapData {
	try {
		const raw = readFileSync(getHeatmapPath(), "utf-8")
		return JSON.parse(raw) as HeatmapData
	} catch {
		return { hours: {} }
	}
}

/** Update heatmap with current usage data. */
export function updateHeatmap(sessionPct: number, weeklyPct: number): void {
	const heatmap = readHeatmap()
	const hours = { ...heatmap.hours }

	// Current hour key in UTC: YYYY-MM-DDTHH
	const now = new Date()
	const hourKey = now.toISOString().slice(0, 13)

	// Update entry — track peak values
	const existing = hours[hourKey] ?? { sessionPct: 0, weeklyPct: 0, samples: 0 }
	hours[hourKey] = {
		sessionPct: Math.max(existing.sessionPct, sessionPct),
		weeklyPct: Math.max(existing.weeklyPct, weeklyPct),
		samples: existing.samples + 1,
	}

	// Prune entries older than 28 days
	const cutoff = new Date(now.getTime() - HEATMAP_MAX_DAYS * 24 * 60 * 60 * 1000)
	const cutoffKey = cutoff.toISOString().slice(0, 13)
	for (const key of Object.keys(hours)) {
		if (key < cutoffKey) delete hours[key]
	}

	try {
		ensureStateDir()
		writeFileSync(getHeatmapPath(), JSON.stringify({ hours }))
	} catch {
		// Non-fatal
	}
}

/** Compute usage velocity in fraction/min from recent samples (utilization is 0.0–1.0). */
export function computeVelocity(samples: HistorySample[]): number | null {
	if (samples.length < 2) return null

	const now = Date.now() / 1000
	const recent = samples.filter((s) => s.t > now - 300) // last 5 min
	if (recent.length < 2) return null

	const dt = recent[recent.length - 1].t - recent[0].t
	if (dt < 10) return null // less than 10 seconds of data

	const ds = recent[recent.length - 1].s - recent[0].s
	return ds / (dt / 60) // fraction per minute
}

/** Estimate time until 100% via linear regression. Returns string like "~2h 15m" or null.
 *  currentUtil is 0.0–1.0. */
export function estimateRunway(samples: HistorySample[], currentUtil: number): string | null {
	if (samples.length < 2 || currentUtil >= 1.0) return null

	const now = Date.now() / 1000
	const recent = samples.filter((s) => s.t > now - 600) // last 10 min
	if (recent.length < 2) return null

	// Linear regression: utilization (0–1) vs time
	const n = recent.length
	let sumT = 0, sumS = 0, sumTS = 0, sumTT = 0
	for (const s of recent) {
		sumT += s.t
		sumS += s.s
		sumTS += s.t * s.s
		sumTT += s.t * s.t
	}

	const denom = n * sumTT - sumT * sumT
	if (Math.abs(denom) < 1e-10) return null

	const slope = (n * sumTS - sumT * sumS) / denom // fraction per second
	if (slope <= 0.00001) return null // flat or declining

	const remaining = 1.0 - currentUtil
	const secondsToFull = remaining / slope
	if (secondsToFull > 86400) return null // > 24h, not useful

	const hours = Math.floor(secondsToFull / 3600)
	const minutes = Math.floor((secondsToFull % 3600) / 60)

	if (hours > 0) return `~${hours}h ${String(minutes).padStart(2, "0")}m`
	return `~${minutes}m`
}
