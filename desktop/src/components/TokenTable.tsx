import type { ModelBreakdown } from "../types"
import { formatTokens, formatCost } from "../lib/format"

type Props = { breakdowns: ModelBreakdown[]; totalCost: number }

export function TokenTable({ breakdowns, totalCost }: Props) {
	const sorted = [...breakdowns].filter((b) => b.totalTokens > 0).sort((a, b) => b.cost - a.cost)

	return (
		<div className="flex flex-col gap-2 rounded-xl bg-[var(--color-surface-raised)] p-3">
			<div className="flex items-center gap-1.5">
				<span className="text-xs">🧩</span>
				<span className="text-xs font-semibold">Model breakdown</span>
				<span className="flex-1" />
				<span className="text-[10px] opacity-40">{formatCost(totalCost)} total</span>
			</div>
			<div className="flex flex-col gap-1">
				{sorted.map((m) => (
					<div key={m.model} className="flex items-center gap-2 text-[11px]">
						<span className="min-w-0 flex-1 truncate font-medium opacity-70">{m.model}</span>
						<span className="tabular-nums opacity-50">{formatTokens(m.totalTokens)}</span>
						<span className="w-14 text-right tabular-nums font-medium text-orange-400">{formatCost(m.cost)}</span>
					</div>
				))}
			</div>
		</div>
	)
}
