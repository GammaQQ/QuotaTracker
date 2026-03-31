import { useState, useEffect } from "react"
import { check } from "@tauri-apps/plugin-updater"

type UpdateState = {
	available: boolean
	version: string | null
	checking: boolean
}

export function useUpdater() {
	const [state, setState] = useState<UpdateState>({
		available: false,
		version: null,
		checking: false,
	})

	useEffect(() => {
		checkForUpdate()
		// Check every 30 minutes
		const interval = setInterval(checkForUpdate, 30 * 60 * 1000)
		return () => clearInterval(interval)
	}, [])

	async function checkForUpdate() {
		setState((s) => ({ ...s, checking: true }))
		try {
			const update = await check()
			if (update) {
				setState({ available: true, version: update.version, checking: false })
			} else {
				setState({ available: false, version: null, checking: false })
			}
		} catch {
			setState((s) => ({ ...s, checking: false }))
		}
	}

	return state
}
