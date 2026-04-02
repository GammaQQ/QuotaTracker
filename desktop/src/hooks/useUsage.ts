import { useState, useEffect, useCallback, useRef } from "react"
import { invoke } from "@tauri-apps/api/core"
import type { UsageOutput } from "../types"

function updateTray(data: UsageOutput) {
	const util = data.oauth?.fiveHour.utilization
	const title = util != null ? `${Math.round(util * 100)}%` : "AI"
	const session = util != null ? `Session: ${Math.round(util * 100)}%` : ""
	const weekly = data.oauth?.sevenDay.utilization != null
		? `Weekly: ${Math.round(data.oauth.sevenDay.utilization * 100)}%`
		: ""
	const tooltip = [session, weekly].filter(Boolean).join(" · ") || "QuotaTracker"
	invoke("update_tray", { title, tooltip }).catch(() => {})
}

/** Pick poll interval based on utilization: high ≥50% → 2min, medium ≥20% → 3min, low → 4min */
function getInterval(data: UsageOutput | null): number {
	const util = data?.oauth?.fiveHour.utilization
	if (util == null) return 3 * 60_000
	if (util >= 0.5) return 2 * 60_000
	if (util >= 0.2) return 3 * 60_000
	return 4 * 60_000
}

export function useUsage() {
	const [data, setData] = useState<UsageOutput | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const dataRef = useRef<UsageOutput | null>(null)

	const scheduleNext = useCallback(() => {
		if (timerRef.current) clearTimeout(timerRef.current)
		const ms = getInterval(dataRef.current)
		timerRef.current = setTimeout(() => poll(), ms)
	}, [])

	const poll = useCallback(async () => {
		setLoading(true)
		try {
			const result = await invoke<UsageOutput>("fetch_usage")
			setData(result)
			dataRef.current = result
			setError(null)
			updateTray(result)
		} catch (err) {
			setError(String(err))
		} finally {
			setLoading(false)
			scheduleNext()
		}
	}, [scheduleNext])

	const refresh = useCallback(async () => {
		if (timerRef.current) clearTimeout(timerRef.current)
		await poll()
	}, [poll])

	useEffect(() => {
		poll()
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current)
		}
	}, [])

	return { data, error, loading, refresh }
}
