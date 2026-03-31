import { useMemo } from "react"
import { AreaChart, Area, ResponsiveContainer } from "recharts"
import type { LimitEstimate, EstimateSnapshot } from "../types"
import { formatCost, barColor, formatResetTime, formatResetAt, paceLabel, paceColor } from "../lib/format"

type Props = {
	title: string
	estimate: LimitEstimate | null | undefined
	utilization: number
	snapshots?: EstimateSnapshot[]
	isSession?: boolean
	delta?: number | null
	resetsIn?: number | null
	resetsAt?: string | null
	headroom?: number
}

export function EstimateCard({ title, estimate, utilization, snapshots = [], isSession, delta, resetsIn, resetsAt, headroom }: Props) {
	const pct = Math.round(utilization * 100)
	const color = barColor(utilization)

	const sparkData = useMemo(() => {
		const cutoff = Date.now() - 24 * 3600 * 1000
		return snapshots
			.filter((s) => new Date(s.timestamp).getTime() > cutoff)
			.map((s) => ({
				t: new Date(s.timestamp).getTime(),
				v: isSession ? s.sessionEstimate : s.weeklyEstimate,
			}))
			.filter((d): d is { t: number; v: number } => d.v != null && d.v > 0)
	}, [snapshots, isSession])

	const resetText = formatResetTime(resetsIn)
	const resetAtText = formatResetAt(resetsAt)
	const pace = headroom != null ? paceLabel(headroom) : null
	const pColor = headroom != null ? paceColor(headroom) : undefined
	const tint = isSession ? "#a855f7" : "#f97316"

	return (
		<div
			className="flex flex-col gap-2 rounded-xl p-3"
			style={{ background: `color-mix(in srgb, ${tint} 6%, var(--color-surface-raised))` }}
		>
			{/* Title row */}
			<div className="flex items-center gap-1.5">
				<span className="text-xs opacity-60">{isSession ? "⏱" : "📅"}</span>
				<span className="text-xs font-semibold opacity-70">{title}</span>
				<span className="flex-1" />
				<span className="text-xs font-bold tabular-nums" style={{ color }}>
					{pct}%
				</span>
				{delta != null && Math.abs(delta) >= 0.001 && !(delta < 0 && utilization < 0.02) && (
					<span className={`text-[10px] font-medium tabular-nums ${delta > 0 ? "text-red-400" : "text-green-400"}`}>
						{delta > 0 ? "▲" : "▼"}
						{Math.round(Math.abs(delta) * 100)}%
					</span>
				)}
			</div>

			{/* Progress bar */}
			<div className="h-2 rounded-full bg-white/5">
				<div
					className="h-full rounded-full transition-all duration-400"
					style={{ width: `${Math.min(pct, 100)}%`, background: `linear-gradient(90deg, ${tint}, ${color})` }}
				/>
			</div>

			{/* Reset + pace */}
			<div className="flex items-center text-[10px]">
				{resetText && (
					<span className="opacity-50">
						Resets in: {resetText}
						{resetAtText && ` at ${resetAtText}`}
					</span>
				)}
				<span className="flex-1" />
				{pace && (
					<span className="font-medium" style={{ color: pColor }}>
						{pace}
					</span>
				)}
			</div>

			{/* Estimate */}
			{estimate && (
				<>
					<div className="h-px bg-white/5" />
					<div className="flex items-start justify-between">
						<div>
							<div className="flex items-baseline gap-1">
								<span className="text-lg font-bold tabular-nums">{formatCost(estimate.currentCost)}</span>
								<span className="text-[10px] opacity-30">/</span>
								<span className="text-sm font-semibold tabular-nums opacity-60">~{formatCost(estimate.estimatedLimitCost)}</span>
							</div>
							<div className="text-[9px] opacity-30">est. limit cost</div>
						</div>
						{sparkData.length >= 2 && (
							<div className="h-8 w-20">
								<ResponsiveContainer width="100%" height="100%">
									<AreaChart data={sparkData}>
										<defs>
											<linearGradient id={`grad-${isSession ? "s" : "w"}`} x1="0" y1="0" x2="0" y2="1">
												<stop offset="0%" stopColor={tint} stopOpacity={0.3} />
												<stop offset="100%" stopColor={tint} stopOpacity={0} />
											</linearGradient>
										</defs>
										<Area type="monotone" dataKey="v" stroke={tint} strokeWidth={1.5} fill={`url(#grad-${isSession ? "s" : "w"})`} dot={false} />
									</AreaChart>
								</ResponsiveContainer>
							</div>
						)}
					</div>
				</>
			)}
		</div>
	)
}
