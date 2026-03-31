/** Root output — everything a UI needs in one JSON blob */
export type UsageOutput = {
	timestamp: string
	version: string
	oauth: OAuthData | null
	usage: UsageData
	analysis: AnalysisData
	errors: DataError[]
}

// ---------------------------------------------------------------------------
// OAuth API data
// ---------------------------------------------------------------------------

export type OAuthData = {
	plan: PlanInfo
	fiveHour: WindowData
	sevenDay: WindowData
	sevenDayOpus: WindowData | null
	sevenDaySonnet: WindowData | null
	extraUsage: ExtraUsageData | null
}

export type PlanInfo = {
	tier: string
	displayName: string
}

export type WindowData = {
	utilization: number
	resetsAt: string | null
	remainingSeconds: number | null
}

export type ExtraUsageData = {
	isEnabled: boolean
	utilization: number
	usedCredits: number
	monthlyLimit: number
}

// ---------------------------------------------------------------------------
// JSONL log-derived data
// ---------------------------------------------------------------------------

export type UsageData = {
	daily: DailySummary[]
	monthly: MonthlySummary[]
	sessionBlocks: SessionBlockSummary[]
	activeBlock: SessionBlockSummary | null
	totals: TokenTotals
	modelBreakdowns: ModelBreakdown[]
}

export type DailySummary = {
	date: string
	inputTokens: number
	outputTokens: number
	cacheCreationTokens: number
	cacheReadTokens: number
	totalTokens: number
	totalCost: number
	models: string[]
	modelBreakdowns: ModelBreakdown[]
}

export type MonthlySummary = {
	month: string
	inputTokens: number
	outputTokens: number
	cacheCreationTokens: number
	cacheReadTokens: number
	totalTokens: number
	totalCost: number
	models: string[]
	modelBreakdowns: ModelBreakdown[]
}

export type ModelBreakdown = {
	model: string
	inputTokens: number
	outputTokens: number
	cacheCreationTokens: number
	cacheReadTokens: number
	totalTokens: number
	cost: number
}

export type SessionBlockSummary = {
	id: string
	startTime: string
	endTime: string
	actualEndTime: string | null
	isActive: boolean
	isGap: boolean
	inputTokens: number
	outputTokens: number
	cacheCreationTokens: number
	cacheReadTokens: number
	totalTokens: number
	costUSD: number
	models: string[]
	burnRate: BurnRateData | null
	projection: ProjectionData | null
}

export type BurnRateData = {
	tokensPerMinute: number
	costPerHour: number
}

export type ProjectionData = {
	projectedTokens: number
	projectedCost: number
	remainingMinutes: number
}

export type TokenTotals = {
	inputTokens: number
	outputTokens: number
	cacheCreationTokens: number
	cacheReadTokens: number
	totalTokens: number
	totalCost: number
}

// ---------------------------------------------------------------------------
// Analysis & recommendations
// ---------------------------------------------------------------------------

export type AnalysisData = {
	recommendation: Recommendation
	history: HistorySnapshot
	heatmap: HeatmapData
	estimates: LimitEstimates
}

export type LimitEstimates = {
	session: LimitEstimate | null
	weekly: LimitEstimate | null
	snapshots: EstimateSnapshot[]
}

export type LimitEstimate = {
	currentCost: number
	currentPercent: number
	estimatedLimitCost: number
}

export type EstimateSnapshot = {
	timestamp: string
	hour: number
	sessionEstimate: number | null
	weeklyEstimate: number | null
	sessionPercent: number
	weeklyPercent: number
}

export type Recommendation = {
	bestTool: string
	reason: string
	sessionHeadroomPercent: number
	weeklyHeadroomPercent: number
	estimatedRunway: string | null
}

export type HistorySnapshot = {
	samples: HistorySample[]
	velocity: number | null
}

export type HistorySample = {
	t: number
	s: number
	w: number
}

export type HeatmapData = {
	hours: Record<string, HeatmapEntry>
}

export type HeatmapEntry = {
	sessionPct: number
	weeklyPct: number
	samples: number
}

export type DataError = {
	source: "oauth" | "jsonl" | "history" | "heatmap"
	message: string
}
