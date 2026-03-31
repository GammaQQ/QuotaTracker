import Foundation

// MARK: - Root

struct UsageOutput: Codable, Sendable {
    let timestamp: String
    let version: String
    let oauth: OAuthData?
    let usage: UsageData
    let analysis: AnalysisData
    let errors: [DataError]
}

// MARK: - OAuth

struct OAuthData: Codable, Sendable {
    let plan: PlanInfo
    let fiveHour: WindowData
    let sevenDay: WindowData
    let sevenDayOpus: WindowData?
    let sevenDaySonnet: WindowData?
    let extraUsage: ExtraUsageData?
}

struct PlanInfo: Codable, Sendable {
    let tier: String
    let displayName: String
}

struct WindowData: Codable, Sendable {
    let utilization: Double
    let resetsAt: String?
    let remainingSeconds: Double?
}

struct ExtraUsageData: Codable, Sendable {
    let isEnabled: Bool
    let utilization: Double
    let usedCredits: Double
    let monthlyLimit: Double
}

// MARK: - Usage

struct UsageData: Codable, Sendable {
    let daily: [DailySummary]
    let monthly: [MonthlySummary]
    let sessionBlocks: [SessionBlockSummary]
    let activeBlock: SessionBlockSummary?
    let totals: TokenTotals
    let modelBreakdowns: [ModelBreakdown]
}

struct DailySummary: Codable, Sendable, Identifiable {
    var id: String { date }
    let date: String
    let inputTokens: Int
    let outputTokens: Int
    let cacheCreationTokens: Int
    let cacheReadTokens: Int
    let totalTokens: Int
    let totalCost: Double
    let models: [String]
    let modelBreakdowns: [ModelBreakdown]
}

struct MonthlySummary: Codable, Sendable, Identifiable {
    var id: String { month }
    let month: String
    let inputTokens: Int
    let outputTokens: Int
    let cacheCreationTokens: Int
    let cacheReadTokens: Int
    let totalTokens: Int
    let totalCost: Double
    let models: [String]
    let modelBreakdowns: [ModelBreakdown]
}

struct ModelBreakdown: Codable, Sendable, Identifiable {
    var id: String { model }
    let model: String
    let inputTokens: Int
    let outputTokens: Int
    let cacheCreationTokens: Int
    let cacheReadTokens: Int
    let totalTokens: Int
    let cost: Double
}

struct SessionBlockSummary: Codable, Sendable, Identifiable {
    var id: String
    let startTime: String
    let endTime: String
    let actualEndTime: String?
    let isActive: Bool
    let isGap: Bool
    let inputTokens: Int
    let outputTokens: Int
    let cacheCreationTokens: Int
    let cacheReadTokens: Int
    let totalTokens: Int
    let costUSD: Double
    let models: [String]
    let burnRate: BurnRateData?
    let projection: ProjectionData?
}

struct BurnRateData: Codable, Sendable {
    let tokensPerMinute: Double
    let costPerHour: Double
}

struct ProjectionData: Codable, Sendable {
    let projectedTokens: Double
    let projectedCost: Double
    let remainingMinutes: Double
}

struct TokenTotals: Codable, Sendable {
    let inputTokens: Int
    let outputTokens: Int
    let cacheCreationTokens: Int
    let cacheReadTokens: Int
    let totalTokens: Int
    let totalCost: Double
}

// MARK: - Analysis

struct AnalysisData: Codable, Sendable {
    let recommendation: Recommendation
    let history: HistorySnapshot
    let heatmap: HeatmapData
    let estimates: LimitEstimates?
}

struct Recommendation: Codable, Sendable {
    let bestTool: String
    let reason: String
    let sessionHeadroomPercent: Double
    let weeklyHeadroomPercent: Double
    let estimatedRunway: String?
}

struct HistorySnapshot: Codable, Sendable {
    let samples: [HistorySample]
    let velocity: Double?
}

struct HistorySample: Codable, Sendable, Identifiable {
    var id: Double { t }
    let t: Double
    let s: Double
    let w: Double
}

struct HeatmapData: Codable, Sendable {
    let hours: [String: HeatmapEntry]
}

struct HeatmapEntry: Codable, Sendable {
    let sessionPct: Double
    let weeklyPct: Double
    let samples: Int
}

// MARK: - Estimates

struct LimitEstimates: Codable, Sendable {
    let session: LimitEstimate?
    let weekly: LimitEstimate?
    let snapshots: [EstimateSnapshot]
}

struct LimitEstimate: Codable, Sendable {
    let currentCost: Double
    let currentPercent: Double
    let estimatedLimitCost: Double
}

struct EstimateSnapshot: Codable, Sendable, Identifiable {
    var id: String { timestamp }
    let timestamp: String
    let hour: Int
    let sessionEstimate: Double?
    let weeklyEstimate: Double?
    let sessionPercent: Double
    let weeklyPercent: Double
}

// MARK: - Errors

struct DataError: Codable, Sendable, Identifiable {
    var id: String { "\(source)-\(message)" }
    let source: String
    let message: String
}
