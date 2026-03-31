export type UsageOutput = {
	timestamp: string
	version: string
	oauth: OAuthData | null
	usage: UsageData
	analysis: AnalysisData
	errors: DataError[]
}

export type OAuthData = {
	plan: { tier: string; displayName: string }
	fiveHour: WindowData
	sevenDay: WindowData
	sevenDayOpus: WindowData | null
	sevenDaySonnet: WindowData | null
	extraUsage: ExtraUsageData | null
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
	burnRate: { tokensPerMinute: number; costPerHour: number } | null
	projection: { projectedTokens: number; projectedCost: number; remainingMinutes: number } | null
}

export type TokenTotals = {
	inputTokens: number
	outputTokens: number
	cacheCreationTokens: number
	cacheReadTokens: number
	totalTokens: number
	totalCost: number
}

export type AnalysisData = {
	recommendation: Recommendation
	history: { samples: HistorySample[]; velocity: number | null }
	heatmap: { hours: Record<string, { sessionPct: number; weeklyPct: number; samples: number }> }
	estimates?: LimitEstimates
}

export type Recommendation = {
	bestTool: string
	reason: string
	sessionHeadroomPercent: number
	weeklyHeadroomPercent: number
	estimatedRunway: string | null
}

export type HistorySample = { t: number; s: number; w: number }

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

export type DataError = { source: string; message: string }
