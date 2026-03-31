import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { getStateDir } from "../utils/paths.ts"
import type {
	OAuthData,
	LimitEstimates,
	LimitEstimate,
	EstimateSnapshot,
} from "../types.ts"

const SNAPSHOTS_FILE = "estimate-snapshots.json"
const MAX_SNAPSHOTS = 2_000
const MAX_AGE_DAYS = 28

function getSnapshotsPath(): string {
	return join(getStateDir(), SNAPSHOTS_FILE)
}

function readSnapshots(): EstimateSnapshot[] {
	try {
		const raw = readFileSync(getSnapshotsPath(), "utf-8")
		return JSON.parse(raw) as EstimateSnapshot[]
	} catch {
		return []
	}
}

function writeSnapshots(snapshots: EstimateSnapshot[]): void {
	try {
		mkdirSync(getStateDir(), { recursive: true })
		writeFileSync(getSnapshotsPath(), JSON.stringify(snapshots))
	} catch {
		// Non-fatal
	}
}

function computeEstimate(
	utilization: number,
	cost: number,
): LimitEstimate | null {
	if (utilization < 0.01) return null // less than 1% — estimate too unstable
	return {
		currentCost: cost,
		currentPercent: utilization * 100,
		estimatedLimitCost: cost / utilization,
	}
}

/** Compute limit estimates and append a snapshot.
 *  sessionCost = sum of JSONL blocks in current 5h window.
 *  weeklyCost  = sum of JSONL daily costs in current 7-day window. */
export function computeEstimates(
	oauth: OAuthData | null,
	sessionCost: number,
	weeklyCost: number,
): LimitEstimates {
	if (!oauth) {
		return { session: null, weekly: null, snapshots: readSnapshots() }
	}

	const sessionUtil = oauth.fiveHour.utilization
	const weeklyUtil = oauth.sevenDay.utilization

	const session = computeEstimate(sessionUtil, sessionCost)
	const weekly = computeEstimate(weeklyUtil, weeklyCost)

	// Append snapshot
	const now = new Date()
	const snapshot: EstimateSnapshot = {
		timestamp: now.toISOString(),
		hour: now.getUTCHours(),
		sessionEstimate: session?.estimatedLimitCost ?? null,
		weeklyEstimate: weekly?.estimatedLimitCost ?? null,
		sessionPercent: sessionUtil * 100,
		weeklyPercent: weeklyUtil * 100,
	}

	let snapshots = readSnapshots()

	snapshots.push(snapshot)

	// Prune old entries
	const cutoff = new Date(
		now.getTime() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
	).toISOString()
	snapshots = snapshots.filter((s) => s.timestamp > cutoff).slice(-MAX_SNAPSHOTS)

	writeSnapshots(snapshots)

	return { session, weekly, snapshots }
}
