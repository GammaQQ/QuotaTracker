import { readFileSync } from "node:fs"
import { glob } from "tinyglobby"
import { getClaudeDataPaths } from "../utils/paths.ts"
import type { DailySummary, MonthlySummary, ModelBreakdown, TokenTotals } from "../types.ts"
import { calculateEntryCost, type PricingData, loadPricing } from "./cost.ts"

// ---------------------------------------------------------------------------
// JSONL entry types
// ---------------------------------------------------------------------------

export type RawUsageEntry = {
	timestamp: string
	sessionId?: string
	version?: string
	message: {
		usage: {
			input_tokens: number
			output_tokens: number
			cache_creation_input_tokens?: number
			cache_read_input_tokens?: number
		}
		model?: string
		id?: string
	}
	costUSD?: number
	requestId?: string
}

export type ParsedEntry = {
	timestamp: Date
	model: string
	inputTokens: number
	outputTokens: number
	cacheCreationTokens: number
	cacheReadTokens: number
	costUSD: number | null
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function tryParseEntry(line: string): RawUsageEntry | null {
	try {
		const obj = JSON.parse(line)
		if (obj?.message?.usage?.input_tokens != null) return obj as RawUsageEntry
		return null
	} catch {
		return null
	}
}

function toEntry(raw: RawUsageEntry, pricing: PricingData): ParsedEntry {
	const usage = raw.message.usage
	const model = raw.message.model ?? "unknown"
	const inputTokens = usage.input_tokens
	const outputTokens = usage.output_tokens
	const cacheCreationTokens = usage.cache_creation_input_tokens ?? 0
	const cacheReadTokens = usage.cache_read_input_tokens ?? 0

	let costUSD = raw.costUSD ?? null
	if (costUSD == null) {
		costUSD = calculateEntryCost(model, inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens, pricing)
	}

	return {
		timestamp: new Date(raw.timestamp),
		model,
		inputTokens,
		outputTokens,
		cacheCreationTokens,
		cacheReadTokens,
		costUSD,
	}
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

async function discoverJsonlFiles(): Promise<string[]> {
	const dataPaths = getClaudeDataPaths()
	if (dataPaths.length === 0) return []

	const allFiles: string[] = []
	for (const dataPath of dataPaths) {
		const files = await glob(["**/*.jsonl"], { cwd: dataPath, absolute: true })
		allFiles.push(...files)
	}
	return allFiles
}

// ---------------------------------------------------------------------------
// Loading all entries
// ---------------------------------------------------------------------------

async function loadAllEntries(): Promise<ParsedEntry[]> {
	const files = await discoverJsonlFiles()
	const pricing = await loadPricing()
	const entries: ParsedEntry[] = []

	for (const file of files) {
		try {
			const content = readFileSync(file, "utf-8")
			for (const line of content.split("\n")) {
				if (!line.trim()) continue
				const raw = tryParseEntry(line)
				if (raw) entries.push(toEntry(raw, pricing))
			}
		} catch {
			// Skip unreadable files
		}
	}

	// Sort by timestamp ascending
	entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
	return entries
}

// ---------------------------------------------------------------------------
// Aggregation helpers
// ---------------------------------------------------------------------------

function buildModelBreakdowns(entries: ParsedEntry[]): ModelBreakdown[] {
	const byModel = new Map<string, ModelBreakdown>()
	for (const e of entries) {
		const existing = byModel.get(e.model)
		if (existing) {
			existing.inputTokens += e.inputTokens
			existing.outputTokens += e.outputTokens
			existing.cacheCreationTokens += e.cacheCreationTokens
			existing.cacheReadTokens += e.cacheReadTokens
			existing.totalTokens += e.inputTokens + e.outputTokens + e.cacheCreationTokens + e.cacheReadTokens
			existing.cost += e.costUSD ?? 0
		} else {
			const total = e.inputTokens + e.outputTokens + e.cacheCreationTokens + e.cacheReadTokens
			byModel.set(e.model, {
				model: e.model,
				inputTokens: e.inputTokens,
				outputTokens: e.outputTokens,
				cacheCreationTokens: e.cacheCreationTokens,
				cacheReadTokens: e.cacheReadTokens,
				totalTokens: total,
				cost: e.costUSD ?? 0,
			})
		}
	}
	return [...byModel.values()]
}

function totalFromEntries(entries: ParsedEntry[]): TokenTotals {
	let inputTokens = 0, outputTokens = 0, cacheCreationTokens = 0, cacheReadTokens = 0, totalCost = 0
	for (const e of entries) {
		inputTokens += e.inputTokens
		outputTokens += e.outputTokens
		cacheCreationTokens += e.cacheCreationTokens
		cacheReadTokens += e.cacheReadTokens
		totalCost += e.costUSD ?? 0
	}
	return {
		inputTokens,
		outputTokens,
		cacheCreationTokens,
		cacheReadTokens,
		totalTokens: inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens,
		totalCost,
	}
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Load and aggregate daily usage summaries. */
export async function loadDailyUsage(): Promise<DailySummary[]> {
	const entries = await loadAllEntries()

	const byDate = new Map<string, ParsedEntry[]>()
	for (const e of entries) {
		const date = e.timestamp.toISOString().slice(0, 10)
		const arr = byDate.get(date) ?? []
		arr.push(e)
		byDate.set(date, arr)
	}

	const daily: DailySummary[] = []
	for (const [date, dateEntries] of byDate) {
		const totals = totalFromEntries(dateEntries)
		const models = [...new Set(dateEntries.map((e) => e.model))]
		daily.push({
			date,
			...totals,
			models,
			modelBreakdowns: buildModelBreakdowns(dateEntries),
		})
	}

	return daily.sort((a, b) => a.date.localeCompare(b.date))
}

/** Load and aggregate monthly usage summaries. */
export async function loadMonthlyUsage(): Promise<MonthlySummary[]> {
	const entries = await loadAllEntries()

	const byMonth = new Map<string, ParsedEntry[]>()
	for (const e of entries) {
		const month = e.timestamp.toISOString().slice(0, 7)
		const arr = byMonth.get(month) ?? []
		arr.push(e)
		byMonth.set(month, arr)
	}

	const monthly: MonthlySummary[] = []
	for (const [month, monthEntries] of byMonth) {
		const totals = totalFromEntries(monthEntries)
		const models = [...new Set(monthEntries.map((e) => e.model))]
		monthly.push({
			month,
			...totals,
			models,
			modelBreakdowns: buildModelBreakdowns(monthEntries),
		})
	}

	return monthly.sort((a, b) => a.month.localeCompare(b.month))
}

/** Load all parsed entries for session block analysis. */
export async function loadEntries(): Promise<ParsedEntry[]> {
	return loadAllEntries()
}

/** Calculate overall totals and model breakdowns from entries. */
export function calculateTotals(entries: ParsedEntry[]): { totals: TokenTotals; modelBreakdowns: ModelBreakdown[] } {
	return {
		totals: totalFromEntries(entries),
		modelBreakdowns: buildModelBreakdowns(entries),
	}
}
