import { useUsage } from "./hooks/useUsage"
import { useUpdater } from "./hooks/useUpdater"
import { Dashboard } from "./components/Dashboard"

export default function App() {
	const { data, error, loading, refresh } = useUsage(60_000)
	const update = useUpdater()

	if (!data && !error) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="flex flex-col items-center gap-3">
					<div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
					<span className="text-xs opacity-40">Loading usage data...</span>
				</div>
			</div>
		)
	}

	if (error && !data) {
		return (
			<div className="flex h-screen items-center justify-center p-8">
				<div className="flex flex-col items-center gap-3 text-center">
					<span className="text-2xl">⚠️</span>
					<span className="text-sm text-red-400">{error}</span>
					<button onClick={refresh} className="text-xs text-blue-400 hover:underline cursor-pointer">
						Retry
					</button>
				</div>
			</div>
		)
	}

	return <Dashboard data={data!} loading={loading} onRefresh={refresh} update={update} />
}
