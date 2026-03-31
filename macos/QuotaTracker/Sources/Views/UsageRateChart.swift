import SwiftUI
import Charts

/// Rate-of-change chart: shows how fast utilization is rising or falling.
/// Green = consuming, Red = recovering/resetting. Centered on zero.
struct UsageRateChart: View {
    let samples: [HistorySample]

    private struct RatePoint: Identifiable {
        let id: Int
        let date: Date
        let rate: Double // pct/min change
    }

    private var ratePoints: [RatePoint] {
        guard samples.count >= 2 else { return [] }
        var points: [RatePoint] = []
        for i in 1..<samples.count {
            let dt = samples[i].t - samples[i - 1].t
            guard dt > 0 else { continue }
            let ds = (samples[i].s - samples[i - 1].s) * 100 // to pct
            let rate = ds / (dt / 60) // pct per minute
            points.append(RatePoint(
                id: i,
                date: Date(timeIntervalSince1970: samples[i].t),
                rate: rate
            ))
        }
        return points
    }

    private var maxRate: Double {
        let m = ratePoints.map { abs($0.rate) }.max() ?? 1
        return max(m, 0.5) // at least ±0.5
    }

    private var timeWindowText: String {
        guard let first = samples.first, let last = samples.last else { return "" }
        let totalMin = Int((last.t - first.t) / 60)
        let hrs = totalMin / 60
        let mins = totalMin % 60
        if hrs > 0 { return "\(hrs)h \(mins)m" }
        return "\(mins)m"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Header
            HStack(spacing: 6) {
                Image(systemName: "chart.xyaxis.line")
                    .font(.caption)
                    .foregroundStyle(.green)
                Text("Usage Rate")
                    .font(.subheadline.weight(.semibold))
                Spacer()
                Text(timeWindowText)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            // Y labels + chart
            HStack(spacing: 4) {
                // Left Y labels
                VStack {
                    Text("+\(Int(ceil(maxRate)))%")
                        .foregroundStyle(.green)
                    Spacer()
                    Text("0")
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text("-\(Int(ceil(maxRate)))%")
                        .foregroundStyle(.red)
                }
                .font(.system(size: 9).monospacedDigit())
                .frame(width: 32)

                // Chart
                Chart {
                    // Zero line
                    RuleMark(y: .value("Zero", 0))
                        .foregroundStyle(.secondary.opacity(0.3))
                        .lineStyle(StrokeStyle(lineWidth: 0.5))

                    ForEach(ratePoints) { point in
                        // Area fill
                        AreaMark(
                            x: .value("Time", point.date),
                            y: .value("Rate", point.rate)
                        )
                        .foregroundStyle(
                            .linearGradient(
                                colors: [point.rate >= 0 ? .green.opacity(0.3) : .red.opacity(0.3), .clear],
                                startPoint: point.rate >= 0 ? .top : .bottom,
                                endPoint: point.rate >= 0 ? .bottom : .top
                            )
                        )
                        .interpolationMethod(.catmullRom)

                        // Line
                        LineMark(
                            x: .value("Time", point.date),
                            y: .value("Rate", point.rate)
                        )
                        .foregroundStyle(point.rate >= 0 ? .green : .red)
                        .interpolationMethod(.catmullRom)
                        .lineStyle(StrokeStyle(lineWidth: 1.5))
                    }
                }
                .chartYScale(domain: -maxRate...maxRate)
                .chartYAxis(.hidden)
                .chartXAxis {
                    AxisMarks(values: .automatic(desiredCount: 4)) { _ in
                        AxisGridLine(stroke: StrokeStyle(lineWidth: 0.3))
                    }
                }
                .frame(height: 80)
            }
        }
        .padding(10)
        .background(.quaternary.opacity(0.5))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}
