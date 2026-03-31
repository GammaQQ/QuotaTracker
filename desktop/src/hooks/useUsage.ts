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

export function useUsage(intervalMs = 60_000) {
	const [data, setData] = useState<UsageOutput | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

	const refresh = useCallback(async () => {
		if (loading) return
		setLoading(true)
		try {
			const result = await invoke<UsageOutput>("fetch_usage")
			setData(result)
			setError(null)
			updateTray(result)
		} catch (err) {
			setError(String(err))
		} finally {
			setLoading(false)
		}
	}, [loading])

	useEffect(() => {
		refresh()
		timerRef.current = setInterval(refresh, intervalMs)
		return () => {
			if (timerRef.current) clearInterval(timerRef.current)
		}
	}, [intervalMs])

	return { data, error, loading, refresh }
}
