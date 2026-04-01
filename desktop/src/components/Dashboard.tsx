import { useMemo } from "react"
import type { UsageOutput } from "../types"
import { EstimateCard } from "./EstimateCard"
import { StatCard } from "./StatCard"
import { UsageBar } from "./UsageBar"
import { WeekdayChart } from "./WeekdayChart"
import { TokenTable } from "./TokenTable"

type UpdateInfo = {
	available: boolean
	version: string | null
	checking: boolean
}

type Props = {
	data: UsageOutput
	loading: boolean
	onRefresh: () => void
	update?: UpdateInfo
}

function todayUTC() {
	return new Date().toISOString().slice(0, 10)
}
function monthUTC() {
	return new Date().toISOString().slice(0, 7)
}

export function Dashboard({ data, loading, onRefresh, update }: Props) {
	const oauth = data.oauth
	const est = data.analysis.estimates
	const rec = data.analysis.recommendation
	const velocity = data.analysis.history.velocity

	const todaySummary = useMemo(
		() => data.usage.daily.find((d) => d.date === todayUTC()),
		[data.usage.daily],
	)

	const monthSummary = useMemo(
		() => data.usage.monthly.find((m) => m.month === monthUTC()),
		[data.usage.monthly],
	)

	const weekCost = useMemo(() => {
		if (!oauth?.sevenDay.resetsAt) return { tokens: 0, cost: 0 }
		const resetDate = new Date(oauth.sevenDay.resetsAt)
		const cutoff = new Date(resetDate.getTime() - 7 * 86_400_000).toISOString().slice(0, 10)
		const filtered = data.usage.daily.filter((d) => d.date >= cutoff)
		return {
			tokens: filtered.reduce((s, d) => s + d.totalTokens, 0),
			cost: filtered.reduce((s, d) => s + d.totalCost, 0),
		}
	}, [data.usage.daily, oauth?.sevenDay.resetsAt])

	// Delta: hide negative when utilization near zero (just reset)
	const sessionDelta = useMemo(() => {
		if (velocity == null) return null
		const d = velocity * 5
		if (Math.abs(d) < 0.001) return null
		if (d < 0 && (oauth?.fiveHour.utilization ?? 0) < 0.02) return null
		return d
	}, [velocity, oauth?.fiveHour.utilization])

	const lastUpdated = useMemo(() => {
		const d = new Date(data.timestamp)
		const secs = Math.floor((Date.now() - d.getTime()) / 1000)
		if (secs < 5) return "Just now"
		if (secs < 60) return `${secs}s ago`
		return `${Math.floor(secs / 60)}m ago`
	}, [data.timestamp])

	const breakdowns = useMemo(
		() => data.usage.modelBreakdowns.filter((b) => b.totalTokens > 0).sort((a, b) => b.cost - a.cost),
		[data.usage.modelBreakdowns],
	)

	return (
		<div className="flex h-screen flex-col">
			<div className="flex-1 overflow-y-auto">
				<div className="flex flex-col gap-4 p-4">
					{/* Header */}
					<div className="flex items-center">
						<div>
							<h1 className="text-base font-bold">QuotaTracker</h1>
							{oauth?.plan && <div className="text-[10px] opacity-40">{oauth.plan.displayName}</div>}
						</div>
						<span className="flex-1" />
						{loading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />}
					</div>

					{/* Main limit cards */}
					{oauth && (
						<div className="flex flex-col gap-2.5">
							<EstimateCard
								title="5-Hour Session"
								estimate={est?.session}
								utilization={oauth.fiveHour.utilization}
								snapshots={est?.snapshots}
								isSession
								delta={sessionDelta}
								resetsIn={oauth.fiveHour.remainingSeconds}
								resetsAt={oauth.fiveHour.resetsAt}
								headroom={rec.sessionHeadroomPercent}
							/>
							<EstimateCard
								title="Weekly Limit"
								estimate={est?.weekly}
								utilization={oauth.sevenDay.utilization}
								snapshots={est?.snapshots}
								resetsIn={oauth.sevenDay.remainingSeconds}
								resetsAt={oauth.sevenDay.resetsAt}
								headroom={rec.weeklyHeadroomPercent}
							/>
						</div>
					)}

					{/* Model-specific bars */}
					{oauth && (
						<div className="flex flex-col gap-2">
							{oauth.sevenDayOpus && <UsageBar title="Opus (Weekly)" icon="🧠" utilization={oauth.sevenDayOpus.utilization} tint="#a855f7" />}
							{oauth.sevenDaySonnet && <UsageBar title="Sonnet (Weekly)" icon="✨" utilization={oauth.sevenDaySonnet.utilization} tint="#3b82f6" />}
							{oauth.extraUsage?.isEnabled && (
								<UsageBar
									title="Extra Usage"
									icon="💳"
									utilization={oauth.extraUsage.utilization}
									subtitle={`$${oauth.extraUsage.usedCredits.toFixed(2)} / $${oauth.extraUsage.monthlyLimit.toFixed(0)}`}
									tint="#f97316"
								/>
							)}
						</div>
					)}

					{/* Usage section */}
					<div className="text-[10px] font-semibold uppercase tracking-wider opacity-30 pt-1">Usage</div>
					<div className="grid grid-cols-2 gap-2">
						<StatCard title="Session" icon="⚡" tokens={data.usage.activeBlock?.totalTokens ?? 0} cost={data.usage.activeBlock?.costUSD ?? 0} tint="#a855f7" />
						<StatCard title="Today" icon="☀️" tokens={todaySummary?.totalTokens ?? 0} cost={todaySummary?.totalCost ?? 0} tint="#3b82f6" />
						<StatCard title="Weekly window" icon="📊" tokens={weekCost.tokens} cost={weekCost.cost} tint="#f97316" />
						<StatCard title="This month" icon="📅" tokens={monthSummary?.totalTokens ?? 0} cost={monthSummary?.totalCost ?? 0} tint="#14b8a6" />
					</div>

					{/* Charts */}
					{data.usage.daily.length > 0 && <WeekdayChart days={data.usage.daily} />}

					{/* Model breakdown */}
					{breakdowns.length > 0 && (
						<>
							<div className="text-[10px] font-semibold uppercase tracking-wider opacity-30 pt-1">Model breakdown</div>
							<TokenTable breakdowns={breakdowns} totalCost={data.usage.totals.totalCost} />
						</>
					)}

					{/* Errors */}
					{data.errors.length > 0 && (
						<div className="flex flex-col gap-1 rounded-xl bg-red-500/10 p-3">
							{data.errors.map((e, i) => (
								<div key={i} className="flex items-start gap-1.5 text-[11px]">
									<span className="text-red-400">⚠</span>
									<span className="opacity-60">[{e.source}] {e.message}</span>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Footer */}
			<div className="flex items-center gap-3 border-t border-white/5 px-4 py-2">
				<span className="text-[10px] opacity-30">{lastUpdated}</span>
				<span className="flex-1" />
				{update?.available && (
					<a
						href={`https://github.com/GammaQQ/QuotaTracker/releases/tag/v${update.version}`}
						target="_blank"
						rel="noreferrer"
						className="text-[10px] font-medium text-green-400 hover:text-green-300 transition-colors cursor-pointer"
					>
						v{update.version} available
					</a>
				)}
				<button onClick={onRefresh} className="text-[10px] opacity-40 hover:opacity-70 transition-opacity cursor-pointer">
					↻ Refresh
				</button>
			</div>
		</div>
	)
}
