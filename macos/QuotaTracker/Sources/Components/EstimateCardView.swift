import SwiftUI
import Charts

struct EstimateCardView: View {
    var title: String = "Weekly limit"
    let estimate: LimitEstimate?
    let utilization: Double
    var snapshots: [EstimateSnapshot] = []
    var isSession: Bool = false
    var delta: Double? = nil
    var resetsIn: String? = nil
    var resetsAt: String? = nil
    var paceLabel: String? = nil
    var tint: Color = .orange

    @State private var hoveredDate: Date?

    private var pct: Int { Int(utilization * 100) }

    private var hoveredValue: Double? {
        guard let sel = hoveredDate else { return nil }
        let data = sparklineData
        guard !data.isEmpty else { return nil }
        return data.min(by: { abs($0.date.timeIntervalSince(sel)) < abs($1.date.timeIntervalSince(sel)) })?.value
    }

    private var fillPercent: Double {
        min(max(utilization, 0), 1.0)
    }

    private var sparklineData: [(date: Date, value: Double)] {
        let cutoff = Date().addingTimeInterval(-24 * 3600)
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return snapshots.compactMap { snap in
            guard let d = iso.date(from: snap.timestamp), d > cutoff else { return nil }
            let val = isSession ? snap.sessionEstimate : snap.weeklyEstimate
            guard let v = val, v > 0 else { return nil }
            return (date: d, value: v)
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Row 1: title + pct + delta
            HStack(spacing: 6) {
                Image(systemName: isSession ? "clock" : "calendar")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(title)
                    .font(.subheadline.weight(.semibold))
                Spacer()
                Text("\(pct)%")
                    .font(.subheadline.monospacedDigit().weight(.bold))
                    .foregroundStyle(fillColor)
                if let delta {
                    deltaView(delta)
                }
            }

            // Row 2: progress bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(.quaternary)
                    RoundedRectangle(cornerRadius: 4)
                        .fill(tint.gradient)
                        .frame(width: max(0, geo.size.width * min(utilization, 1.0)))
                        .animation(.easeInOut(duration: 0.4), value: utilization)
                }
            }
            .frame(height: 8)

            // Row 3: reset info + pace
            HStack {
                if let resetsIn {
                    HStack(spacing: 0) {
                        Text("Resets in: \(resetsIn)")
                        if let resetsAt {
                            Text(" at \(resetsAt)")
                        }
                    }
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                }
                Spacer()
                if let paceLabel {
                    Text(paceLabel)
                        .font(.caption2.weight(.medium))
                        .foregroundStyle(paceColor)
                }
            }

            // Row 4: estimate (cost / ~limit) + sparkline
            if let est = estimate {
                Divider().opacity(0.3)

                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(alignment: .firstTextBaseline, spacing: 4) {
                            Text(formatCost(est.currentCost))
                                .font(.title3.monospacedDigit().weight(.bold))
                                .foregroundStyle(.primary)
                            Text("/")
                                .font(.caption.weight(.medium))
                                .foregroundStyle(.tertiary)
                            Text("~\(formatCost(est.estimatedLimitCost))")
                                .font(.callout.monospacedDigit().weight(.semibold))
                                .foregroundStyle(.secondary)
                        }
                        if let hv = hoveredValue {
                            Text("~\(formatCost(hv))")
                                .font(.system(size: 9).weight(.semibold).monospacedDigit())
                                .foregroundStyle(tint)
                        } else {
                            Text("est. limit cost")
                                .font(.system(size: 9))
                                .foregroundStyle(.tertiary)
                        }
                    }

                    Spacer()

                    if sparklineData.count >= 2 {
                        sparkline
                            .frame(width: 80, height: 32)
                    }
                }
            }
        }
        .padding(10)
        .background(.quaternary.opacity(0.5))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    // MARK: - Sparkline

    private var sparkline: some View {
        let data = sparklineData
        let values = data.map(\.value)
        let minVal = (values.min() ?? 0) * 0.9
        let maxVal = (values.max() ?? 1) * 1.1

        return Chart {
            ForEach(data, id: \.date) { point in
                LineMark(
                    x: .value("Time", point.date),
                    y: .value("Est", point.value)
                )
                .foregroundStyle(tint.opacity(0.8))
                .interpolationMethod(.catmullRom)

                AreaMark(
                    x: .value("Time", point.date),
                    y: .value("Est", point.value)
                )
                .foregroundStyle(tint.opacity(0.1))
                .interpolationMethod(.catmullRom)
            }

            if let sel = hoveredDate {
                RuleMark(x: .value("Sel", sel))
                    .foregroundStyle(tint.opacity(0.6))
                    .lineStyle(StrokeStyle(lineWidth: 1))

                if let hv = hoveredValue {
                    PointMark(
                        x: .value("Time", sel),
                        y: .value("Est", hv)
                    )
                    .foregroundStyle(tint)
                    .symbolSize(20)
                }
            }
        }
        .chartXSelection(value: $hoveredDate)
        .chartYScale(domain: minVal...maxVal)
        .chartXAxis(.hidden)
        .chartYAxis(.hidden)
    }

    // MARK: - Helpers

    private func deltaView(_ d: Double) -> some View {
        let absPct = Int(abs(d) * 100)
        let isUp = d > 0
        return Text("\(isUp ? "▲" : "▼")\(absPct)%")
            .font(.caption2.monospacedDigit().weight(.medium))
            .foregroundStyle(isUp ? .red : .green)
    }

    private var fillColor: Color {
        if utilization >= 0.9 { return .red }
        if utilization >= 0.7 { return .orange }
        return .green
    }

    private var paceColor: Color {
        guard let pace = paceLabel?.lowercased() else { return .secondary }
        if pace.contains("plenty") { return .green }
        if pace.contains("watch") { return .yellow }
        if pace.contains("low") || pace.contains("exhausted") { return .orange }
        return .secondary
    }

    private func formatCost(_ value: Double) -> String {
        if value >= 100 {
            return String(format: "$%.0f", value)
        }
        if value >= 1.0 {
            return String(format: "$%.2f", value)
        }
        return String(format: "$%.3f", value)
    }
}
