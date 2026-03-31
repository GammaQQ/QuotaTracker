import SwiftUI
import os

private let log = Logger(subsystem: "com.quotatracker", category: "ViewModel")

/// Central view model — fetches data from CoreRunner on a timer.
@MainActor
@Observable
final class UsageViewModel {
    var output: UsageOutput?
    var error: String?
    var isLoading = false
    var refreshInterval: TimeInterval = 60

    private let runner: CoreRunner
    private var timer: Timer?

    init(binaryPath: String? = nil) {
        self.runner = CoreRunner(binaryPath: binaryPath)
    }

    func startPolling() {
        refresh()
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: refreshInterval, repeats: true) { [weak self] _ in
            guard let self else { return }
            Task { @MainActor in self.refresh() }
        }
        // Tick timer to keep "Updated Xs ago" fresh
        tickTimer?.invalidate()
        tickTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            guard let self else { return }
            Task { @MainActor in
                // Touch lastFetchedAt to trigger re-render of lastUpdatedText
                self.lastFetchedAt = self.lastFetchedAt
            }
        }
    }

    func stopPolling() {
        timer?.invalidate()
        timer = nil
        tickTimer?.invalidate()
        tickTimer = nil
    }

    func refresh() {
        guard !isLoading else { return }
        isLoading = true
        log.info("refresh() starting")
        Task {
            do {
                let result = try await runner.fetch()
                log.info("refresh() success, plan: \(result.oauth?.plan.displayName ?? "nil")")
                self.output = result
                self.error = nil
                self.lastFetchedAt = Date()
            } catch {
                log.error("refresh() failed: \(error)")
                self.error = error.localizedDescription
            }
            self.isLoading = false
            log.info("refresh() done, isLoading=false")
        }
    }

    // MARK: - Computed helpers

    var lastUpdatedText: String {
        guard let date = lastFetchedAt else { return "" }
        let secs = Int(-date.timeIntervalSinceNow)
        if secs < 5 { return "Just now" }
        if secs < 60 { return "Updated \(secs)s ago" }
        return "Updated \(secs / 60)m ago"
    }

    // Ticks every 10s to keep lastUpdatedText fresh
    private(set) var lastFetchedAt: Date?
    private var tickTimer: Timer?

    var sessionUtilization: Double {
        output?.oauth?.fiveHour.utilization ?? 0
    }

    var weeklyUtilization: Double {
        output?.oauth?.sevenDay.utilization ?? 0
    }

    var planName: String {
        output?.oauth?.plan.displayName ?? "—"
    }

    var sessionResetText: String {
        guard let secs = output?.oauth?.fiveHour.remainingSeconds else { return "" }
        let mins = Int(secs) / 60
        let hrs = mins / 60
        if hrs > 0 { return "\(hrs)h \(mins % 60)m" }
        return "\(mins)m"
    }

    var sessionResetAtText: String? {
        formatResetAt(output?.oauth?.fiveHour.resetsAt)
    }

    var weeklyResetText: String {
        guard let secs = output?.oauth?.sevenDay.remainingSeconds else { return "" }
        let totalMins = Int(secs) / 60
        let days = totalMins / 1440
        let hrs = (totalMins % 1440) / 60
        let mins = totalMins % 60
        if days > 0 { return "\(days) days \(hrs)h \(mins)m" }
        if hrs > 0 { return "\(hrs)h \(mins)m" }
        return "\(mins)m"
    }

    var weeklyResetAtText: String? {
        formatResetAt(output?.oauth?.sevenDay.resetsAt)
    }

    /// Delta = velocity * 5min window, as fraction change.
    /// Hidden after session reset (negative delta at low utilization = reset, not real change).
    var sessionDelta: Double? {
        guard let v = output?.analysis.history.velocity else { return nil }
        let d = v * 5
        if abs(d) < 0.001 { return nil }
        // Hide negative delta when utilization is near zero (just reset)
        if d < 0 && sessionUtilization < 0.02 { return nil }
        return d
    }

    var paceLabel: String {
        guard let rec = output?.analysis.recommendation else { return "" }
        if rec.sessionHeadroomPercent > 50 { return "Plenty of room" }
        if rec.sessionHeadroomPercent > 20 { return "Watch your usage" }
        if rec.sessionHeadroomPercent > 5 { return "Running low" }
        return "Almost exhausted"
    }

    var weeklyPaceLabel: String {
        guard let rec = output?.analysis.recommendation else { return "" }
        if rec.weeklyHeadroomPercent > 50 { return "Plenty of room" }
        if rec.weeklyHeadroomPercent > 20 { return "Watch your usage" }
        if rec.weeklyHeadroomPercent > 5 { return "Running low" }
        return "Almost exhausted"
    }

    private func formatResetAt(_ iso: String?) -> String? {
        guard let iso, let date = ISO8601DateFormatter().date(from: iso) else { return nil }
        let f = DateFormatter()
        f.dateFormat = "h:mm a"
        return f.string(from: date)
    }

    var menuBarTitle: String {
        guard output?.oauth != nil else { return "AI" }
        let s = Int(sessionUtilization * 100)
        return "\(s)%"
    }

    var recommendation: Recommendation? {
        output?.analysis.recommendation
    }

    var recentDaily: [DailySummary] {
        Array((output?.usage.daily ?? []).suffix(14))
    }

    var allDaily: [DailySummary] {
        output?.usage.daily ?? []
    }

    var totalCost: Double {
        output?.usage.totals.totalCost ?? 0
    }

    var modelBreakdowns: [ModelBreakdown] {
        (output?.usage.modelBreakdowns ?? [])
            .filter { $0.totalTokens > 0 }
            .sorted { $0.cost > $1.cost }
    }

    var historySamples: [HistorySample] {
        output?.analysis.history.samples ?? []
    }

    // MARK: - Stat card data

    var todayTokens: Int {
        todaySummary?.totalTokens ?? 0
    }

    var todayCost: Double {
        todaySummary?.totalCost ?? 0
    }

    var activeBlockTokens: Int {
        output?.usage.activeBlock?.totalTokens ?? 0
    }

    var activeBlockCost: Double {
        output?.usage.activeBlock?.costUSD ?? 0
    }

    var thisWeekTokens: Int {
        last7Days.reduce(0) { $0 + $1.totalTokens }
    }

    var thisWeekCost: Double {
        last7Days.reduce(0) { $0 + $1.totalCost }
    }

    private var last7Days: [DailySummary] {
        // Calculate start of current 7-day window from resetsAt
        let cutoff: String
        if let resetsAt = output?.oauth?.sevenDay.resetsAt,
           let resetDate = ISO8601DateFormatter().date(from: resetsAt) {
            // Window started 7 days before the reset
            let windowStart = resetDate.addingTimeInterval(-7 * 86400)
            cutoff = Self.utcDayFormatter.string(from: windowStart)
        } else {
            // Fallback: last 7 days
            cutoff = Self.utcDayFormatter.string(from: Date().addingTimeInterval(-6 * 86400))
        }
        return (output?.usage.daily ?? []).filter { $0.date >= cutoff }
    }

    var thisMonthTokens: Int {
        currentMonthSummary?.totalTokens ?? 0
    }

    var thisMonthCost: Double {
        currentMonthSummary?.totalCost ?? 0
    }

    private var todaySummary: DailySummary? {
        // Core uses UTC dates (toISOString().slice(0,10))
        let today = Self.utcDayFormatter.string(from: Date())
        return output?.usage.daily.first { $0.date == today }
    }

    private var currentMonthSummary: MonthlySummary? {
        let month = Self.utcMonthFormatter.string(from: Date())
        return output?.usage.monthly.first { $0.month == month }
    }

    private static let utcDayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(identifier: "UTC")
        return f
    }()

    private static let utcMonthFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM"
        f.timeZone = TimeZone(identifier: "UTC")
        return f
    }()

    var hasErrors: Bool {
        !(output?.errors.isEmpty ?? true)
    }

    // MARK: - Limit estimates

    var sessionEstimate: LimitEstimate? {
        output?.analysis.estimates?.session
    }

    var weeklyEstimate: LimitEstimate? {
        output?.analysis.estimates?.weekly
    }

    var estimateSnapshots: [EstimateSnapshot] {
        output?.analysis.estimates?.snapshots ?? []
    }
}
