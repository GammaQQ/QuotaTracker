import SwiftUI
import Charts

/// Average daily cost by day of week across all history, with hover tooltip.
struct WeekdayConsumptionChart: View {
    let days: [DailySummary]

    @State private var selectedLabel: String?

    private struct WeekdayBucket: Identifiable {
        let id: Int
        let label: String
        let averageCost: Double
        let totalCost: Double
        let count: Int
    }

    private var buckets: [WeekdayBucket] {
        var totals: [Int: (cost: Double, count: Int)] = [:]
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!

        for day in days {
            guard let date = Self.isoFormatter.date(from: day.date) else { continue }
            let wd = cal.component(.weekday, from: date)
            let existing = totals[wd, default: (0, 0)]
            totals[wd] = (existing.cost + day.totalCost, existing.count + 1)
        }

        let order = [2, 3, 4, 5, 6, 7, 1]
        let labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

        return order.enumerated().compactMap { idx, wd in
            let data = totals[wd, default: (0, 0)]
            return WeekdayBucket(
                id: wd,
                label: labels[idx],
                averageCost: data.count > 0 ? data.cost / Double(data.count) : 0,
                totalCost: data.cost,
                count: data.count
            )
        }
    }

    private var selectedBucket: WeekdayBucket? {
        guard let label = selectedLabel else { return nil }
        return buckets.first { $0.label == label }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Header
            HStack(spacing: 6) {
                Image(systemName: "chart.bar.fill")
                    .font(.caption)
                    .foregroundStyle(.orange)
                Text("Avg. Daily Spend")
                    .font(.subheadline.weight(.semibold))
                Spacer()

                if let b = selectedBucket {
                    HStack(spacing: 3) {
                        Text(b.label)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        Text("·")
                            .foregroundStyle(.tertiary)
                        Text(String(format: "$%.0f avg", b.averageCost))
                            .font(.caption2.weight(.bold).monospacedDigit())
                            .foregroundStyle(.orange)
                        Text("·")
                            .foregroundStyle(.tertiary)
                        Text(String(format: "$%.0f total", b.totalCost))
                            .font(.caption2.monospacedDigit())
                            .foregroundStyle(.secondary)
                        Text("·")
                            .foregroundStyle(.tertiary)
                        Text("\(b.count)d")
                            .font(.caption2.monospacedDigit())
                            .foregroundStyle(.tertiary)
                    }
                } else {
                    Text(String(format: "$%.0f total", buckets.reduce(0) { $0 + $1.totalCost }))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
            .animation(.none, value: selectedLabel)

            Chart(buckets) { bucket in
                BarMark(
                    x: .value("Day", bucket.label),
                    y: .value("Avg Cost", bucket.averageCost)
                )
                .foregroundStyle(bucket.label == selectedLabel ? .orange : .orange.opacity(0.6))
                .cornerRadius(3)
                .annotation(position: .top, spacing: 2) {
                    if bucket.averageCost > 0 {
                        Text(String(format: "$%.0f", bucket.averageCost))
                            .font(.system(size: 8).monospacedDigit())
                            .foregroundStyle(bucket.label == selectedLabel ? Color.orange : Color.gray)
                    }
                }
            }
            .chartXSelection(value: $selectedLabel)
            .chartYAxis {
                AxisMarks(values: .automatic(desiredCount: 3)) { value in
                    AxisValueLabel {
                        if let v = value.as(Double.self) {
                            Text("$\(v, specifier: "%.0f")")
                                .font(.caption2)
                        }
                    }
                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.3))
                }
            }
            .chartXAxis {
                AxisMarks { _ in
                    AxisValueLabel()
                        .font(.caption2)
                }
            }
            .frame(height: 90)
        }
        .padding(10)
        .background(.quaternary.opacity(0.5))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private static let isoFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(identifier: "UTC")
        return f
    }()
}
