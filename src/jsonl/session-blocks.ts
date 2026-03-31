import type { ParsedEntry } from "./loader.ts"
import type { SessionBlockSummary, BurnRateData, ProjectionData } from "../types.ts"

const SESSION_DURATION_HOURS = 5
const SESSION_DURATION_MS = SESSION_DURATION_HOURS * 60 * 60 * 1000

function floorToHour(date: Date): Date {
	const floored = new Date(date)
	floored.setUTCMinutes(0, 0, 0)
	return floored
}

type Block = {
	startTime: Date
	endTime: Date
	actualEndTime: Date | null
	isActive: boolean
	isGap: boolean
	entries: ParsedEntry[]
}

/** Group entries into 5-hour billing blocks. */
export function identifySessionBlocks(entries: ParsedEntry[]): Block[] {
	if (entries.length === 0) return []

	const sorted = [...entries].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
	const blocks: Block[] = []
	const now = new Date()

	let blockStart: Date | null = null
	let blockEntries: ParsedEntry[] = []

	for (const entry of sorted) {
		const entryTime = entry.timestamp

		if (!blockStart) {
			blockStart = floorToHour(entryTime)
			blockEntries = [entry]
			continue
		}

		const timeSinceStart = entryTime.getTime() - blockStart.getTime()
		const lastEntry = blockEntries[blockEntries.length - 1]
		const timeSinceLastEntry = entryTime.getTime() - lastEntry.timestamp.getTime()

		if (timeSinceStart >= SESSION_DURATION_MS || timeSinceLastEntry > SESSION_DURATION_MS) {
			// Finalize current block
			const endTime = new Date(blockStart.getTime() + SESSION_DURATION_MS)
			const actualEnd = blockEntries[blockEntries.length - 1].timestamp
			blocks.push({
				startTime: blockStart,
				endTime,
				actualEndTime: actualEnd,
				isActive: false,
				isGap: false,
				entries: blockEntries,
			})

			// Start new block
			blockStart = floorToHour(entryTime)
			blockEntries = [entry]
		} else {
			blockEntries.push(entry)
		}
	}

	// Finalize last block
	if (blockStart && blockEntries.length > 0) {
		const endTime = new Date(blockStart.getTime() + SESSION_DURATION_MS)
		const actualEnd = blockEntries[blockEntries.length - 1].timestamp
		const isActive = now.getTime() < endTime.getTime()
		blocks.push({
			startTime: blockStart,
			endTime,
			actualEndTime: actualEnd,
			isActive,
			isGap: false,
			entries: blockEntries,
		})
	}

	return blocks
}

/** Calculate burn rate for a block. */
function calculateBurnRate(block: Block): BurnRateData | null {
	if (block.entries.length < 2) return null

	const first = block.entries[0].timestamp.getTime()
	const last = block.entries[block.entries.length - 1].timestamp.getTime()
	const durationMinutes = (last - first) / 60_000
	if (durationMinutes < 1) return null

	let totalTokens = 0
	let totalCost = 0
	for (const e of block.entries) {
		totalTokens += e.inputTokens + e.outputTokens + e.cacheCreationTokens + e.cacheReadTokens
		totalCost += e.costUSD ?? 0
	}

	return {
		tokensPerMinute: totalTokens / durationMinutes,
		costPerHour: (totalCost / durationMinutes) * 60,
	}
}

/** Project remaining usage for an active block. */
function projectUsage(block: Block, burnRate: BurnRateData): ProjectionData | null {
	if (!block.isActive || !burnRate) return null

	const now = new Date()
	const remainingMs = block.endTime.getTime() - now.getTime()
	if (remainingMs <= 0) return null

	const remainingMinutes = remainingMs / 60_000
	let currentTokens = 0
	let currentCost = 0
	for (const e of block.entries) {
		currentTokens += e.inputTokens + e.outputTokens + e.cacheCreationTokens + e.cacheReadTokens
		currentCost += e.costUSD ?? 0
	}

	return {
		projectedTokens: currentTokens + burnRate.tokensPerMinute * remainingMinutes,
		projectedCost: currentCost + (burnRate.costPerHour / 60) * remainingMinutes,
		remainingMinutes,
	}
}

/** Convert internal blocks to output format. */
export function toSessionBlockSummaries(entries: ParsedEntry[]): {
	blocks: SessionBlockSummary[]
	activeBlock: SessionBlockSummary | null
} {
	const rawBlocks = identifySessionBlocks(entries)
	let activeBlock: SessionBlockSummary | null = null

	const blocks: SessionBlockSummary[] = rawBlocks.map((block) => {
		let inputTokens = 0, outputTokens = 0, cacheCreationTokens = 0, cacheReadTokens = 0, costUSD = 0
		const modelSet = new Set<string>()

		for (const e of block.entries) {
			inputTokens += e.inputTokens
			outputTokens += e.outputTokens
			cacheCreationTokens += e.cacheCreationTokens
			cacheReadTokens += e.cacheReadTokens
			costUSD += e.costUSD ?? 0
			modelSet.add(e.model)
		}

		const burnRate = calculateBurnRate(block)
		const projection = burnRate ? projectUsage(block, burnRate) : null

		const summary: SessionBlockSummary = {
			id: block.startTime.toISOString(),
			startTime: block.startTime.toISOString(),
			endTime: block.endTime.toISOString(),
			actualEndTime: block.actualEndTime?.toISOString() ?? null,
			isActive: block.isActive,
			isGap: block.isGap,
			inputTokens,
			outputTokens,
			cacheCreationTokens,
			cacheReadTokens,
			totalTokens: inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens,
			costUSD,
			models: [...modelSet],
			burnRate,
			projection,
		}

		if (block.isActive) activeBlock = summary
		return summary
	})

	return { blocks, activeBlock }
}
