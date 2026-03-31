import SwiftUI

struct DashboardView: View {
    let vm: UsageViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                headerSection

                if let error = vm.error {
                    errorBanner(error)
                }

                if vm.output == nil && vm.error == nil {
                    loadingPlaceholder
                } else {
                    if let oauth = vm.output?.oauth {
                        mainLimitsSection(oauth)
                        modelBarsSection(oauth)
                    }
                    sectionHeader("Usage")
                    statCardsSection
                    if !vm.allDaily.isEmpty {
                        WeekdayConsumptionChart(days: vm.allDaily)
                    }
                    if !vm.modelBreakdowns.isEmpty {
                        sectionHeader("Model breakdown")
                        TokenTable(breakdowns: vm.modelBreakdowns, totalCost: vm.totalCost)
                    }
                    if vm.hasErrors {
                        errorsSection
                    }
                }

                footerSection
            }
            .padding(16)
        }
        .background(.background)
    }

    // MARK: - Header

    private var headerSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("QuotaTracker")
                    .font(.headline)
                if let plan = vm.output?.oauth?.plan {
                    Text(plan.displayName)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            if vm.isLoading {
                ProgressView()
                    .scaleEffect(0.7)
            }
        }
    }

    // MARK: - Footer

    private var footerSection: some View {
        HStack {
            Text(vm.lastUpdatedText)
                .font(.caption2)
                .foregroundStyle(.tertiary)

            Spacer()

            Button {
                vm.refresh()
            } label: {
                Image(systemName: "arrow.clockwise")
                    .font(.caption2)
            }
            .buttonStyle(.borderless)
            .help("Refresh now")

            SettingsLink {
                Text("Settings")
                    .font(.caption2)
            }
            .buttonStyle(.borderless)

            Button("Quit") {
                NSApplication.shared.terminate(nil)
            }
            .font(.caption2)
            .buttonStyle(.borderless)
        }
        .padding(.top, 4)
    }

    // MARK: - Main Limits (Session + Weekly combined cards)

    private func mainLimitsSection(_ oauth: OAuthData) -> some View {
        VStack(spacing: 10) {
            EstimateCardView(
                title: "5-Hour Session",
                estimate: vm.sessionEstimate,
                utilization: oauth.fiveHour.utilization,
                snapshots: vm.estimateSnapshots,
                isSession: true,
                delta: vm.sessionDelta,
                resetsIn: vm.sessionResetText.isEmpty ? nil : vm.sessionResetText,
                resetsAt: vm.sessionResetAtText,
                paceLabel: vm.paceLabel,
                tint: barColor(oauth.fiveHour.utilization)
            )
            EstimateCardView(
                title: "Weekly Limit",
                estimate: vm.weeklyEstimate,
                utilization: oauth.sevenDay.utilization,
                snapshots: vm.estimateSnapshots,
                isSession: false,
                resetsIn: vm.weeklyResetText.isEmpty ? nil : vm.weeklyResetText,
                resetsAt: vm.weeklyResetAtText,
                paceLabel: vm.weeklyPaceLabel,
                tint: barColor(oauth.sevenDay.utilization)
            )
        }
    }

    // MARK: - Model-specific bars (Opus, Sonnet, Extra)

    private func modelBarsSection(_ oauth: OAuthData) -> some View {
        VStack(spacing: 8) {
            if let opus = oauth.sevenDayOpus {
                UsageBarView(
                    title: "Opus (Weekly)",
                    icon: "brain.head.profile",
                    utilization: opus.utilization,
                    tint: .purple
                )
            }
            if let sonnet = oauth.sevenDaySonnet {
                UsageBarView(
                    title: "Sonnet (Weekly)",
                    icon: "sparkles",
                    utilization: sonnet.utilization,
                    tint: .blue
                )
            }
            if let extra = oauth.extraUsage, extra.isEnabled {
                UsageBarView(
                    title: "Extra Usage",
                    icon: "creditcard",
                    utilization: extra.utilization,
                    resetsIn: String(format: "$%.2f / $%.0f", extra.usedCredits, extra.monthlyLimit),
                    tint: .orange
                )
            }
        }
    }

    // MARK: - Stat Cards

    private var statCardsSection: some View {
        Grid(horizontalSpacing: 8, verticalSpacing: 8) {
            GridRow {
                StatCardView(
                    title: "Session",
                    icon: "bolt.fill",
                    tokens: vm.activeBlockTokens,
                    cost: vm.activeBlockCost,
                    tint: .purple
                )
                StatCardView(
                    title: "Today",
                    icon: "sun.max.fill",
                    tokens: vm.todayTokens,
                    cost: vm.todayCost,
                    tint: .blue
                )
            }
            GridRow {
                StatCardView(
                    title: "Weekly window",
                    icon: "chart.bar.fill",
                    tokens: vm.thisWeekTokens,
                    cost: vm.thisWeekCost,
                    tint: .orange
                )
                StatCardView(
                    title: "This month",
                    icon: "calendar",
                    tokens: vm.thisMonthTokens,
                    cost: vm.thisMonthCost,
                    tint: .teal
                )
            }
        }
    }

    // MARK: - Errors

    private var errorsSection: some View {
        GroupBox {
            VStack(alignment: .leading, spacing: 4) {
                ForEach(vm.output?.errors ?? []) { err in
                    HStack(spacing: 4) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundStyle(.yellow)
                            .font(.caption2)
                        Text("[\(err.source)] \(err.message)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        } label: {
            Text("Errors")
                .font(.caption.weight(.medium))
                .foregroundStyle(.secondary)
        }
    }

    // MARK: - Loading & Error

    private var loadingPlaceholder: some View {
        VStack(spacing: 8) {
            ProgressView()
            Text("Loading usage data...")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    private func errorBanner(_ message: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(.red)
            Text(message)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(3)
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.red.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    // MARK: - Helpers

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.caption.weight(.semibold))
            .foregroundStyle(.secondary)
            .textCase(.uppercase)
            .padding(.top, 4)
    }

    private func barColor(_ util: Double) -> Color {
        if util >= 0.9 { return .red }
        if util >= 0.7 { return .orange }
        return .green
    }
}
