import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LabelList } from "recharts"
import type { DailySummary } from "../types"

type Props = { days: DailySummary[] }

const LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
// JS getUTCDay: 0=Sun, map to Mon-first
const DAY_MAP = [6, 0, 1, 2, 3, 4, 5]

export function WeekdayChart({ days }: Props) {
	const buckets = useMemo(() => {
		const totals = Array.from({ length: 7 }, () => ({ cost: 0, count: 0 }))
		for (const d of days) {
			const date = new Date(d.date + "T00:00:00Z")
			const idx = DAY_MAP[date.getUTCDay()]
			totals[idx].cost += d.totalCost
			totals[idx].count++
		}
		return LABELS.map((label, i) => ({
			label,
			avg: totals[i].count > 0 ? totals[i].cost / totals[i].count : 0,
			total: totals[i].cost,
		}))
	}, [days])

	const totalCost = buckets.reduce((s, b) => s + b.total, 0)

	return (
		<div className="flex flex-col gap-2 rounded-xl bg-[var(--color-surface-raised)] p-3">
			<div className="flex items-center gap-1.5">
				<span className="text-xs">📊</span>
				<span className="text-xs font-semibold">Avg. Daily Spend</span>
				<span className="flex-1" />
				<span className="text-[10px] opacity-40">${totalCost.toFixed(0)} total</span>
			</div>
			<div className="h-24">
				<ResponsiveContainer width="100%" height="100%">
					<BarChart data={buckets} margin={{ top: 16, right: 0, bottom: 0, left: 0 }}>
						<XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
						<YAxis hide />
						<Bar dataKey="avg" radius={[3, 3, 0, 0]} fill="#f97316" fillOpacity={0.8}>
							<LabelList
								dataKey="avg"
								position="top"
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								formatter={((v: any) => (Number(v) > 0 ? `$${Number(v).toFixed(0)}` : "")) as any}
								style={{ fontSize: 8, fill: "#6b7280" }}
							/>
						</Bar>
					</BarChart>
				</ResponsiveContainer>
			</div>
		</div>
	)
}
