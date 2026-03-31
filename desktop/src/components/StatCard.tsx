import { formatTokens, formatCost } from "../lib/format"

type Props = {
	title: string
	icon: string
	tokens: number
	cost: number
	tint: string
}

export function StatCard({ title, icon, tokens, cost, tint }: Props) {
	return (
		<div
			className="flex flex-col gap-1.5 rounded-xl p-2.5"
			style={{ background: `color-mix(in srgb, ${tint} 8%, var(--color-surface-raised))` }}
		>
			<div className="flex items-center gap-1">
				<span className="text-[10px]">{icon}</span>
				<span className="text-[10px] font-medium opacity-50">{title}</span>
			</div>
			<div className="text-base font-bold tabular-nums leading-tight">{formatTokens(tokens)}</div>
			<div className="text-[10px] font-medium tabular-nums" style={{ color: tint }}>
				{formatCost(cost)}
			</div>
		</div>
	)
}
