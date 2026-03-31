import { barColor } from "../lib/format"

type Props = {
	title: string
	icon: string
	utilization: number
	subtitle?: string
	tint?: string
}

export function UsageBar({ title, icon, utilization, subtitle, tint }: Props) {
	const pct = Math.round(utilization * 100)
	const color = tint ?? barColor(utilization)

	return (
		<div className="flex flex-col gap-1.5 rounded-xl bg-[var(--color-surface-raised)] p-2.5">
			<div className="flex items-center gap-1.5">
				<span className="text-xs opacity-50">{icon}</span>
				<span className="text-xs font-semibold">{title}</span>
				<span className="flex-1" />
				<span className="text-xs font-bold tabular-nums" style={{ color }}>
					{pct}%
				</span>
			</div>
			<div className="h-1.5 rounded-full bg-white/5">
				<div
					className="h-full rounded-full transition-all duration-400"
					style={{ width: `${Math.min(pct, 100)}%`, background: color }}
				/>
			</div>
			{subtitle && <div className="text-[10px] opacity-40">{subtitle}</div>}
		</div>
	)
}
