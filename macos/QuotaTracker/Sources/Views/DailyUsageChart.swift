import SwiftUI
import Charts

/// Bar chart showing daily token costs (last 7 days).
struct DailyUsageChart: View {
    let days: [DailySummary]

    private var recent: [DailySummary] {
        Array(days.suffix(7))
    }

    var body: some View {
        GroupBox {
            Chart(recent) { day in
                BarMark(
                    x: .value("Date", weekdayLabel(day.date)),
                    y: .value("Cost", day.totalCost)
                )
                .foregroundStyle(.teal.gradient)
                .cornerRadius(3)
            }
            .chartYAxis {
                AxisMarks(values: .automatic(desiredCount: 4)) { value in
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
            .frame(height: 100)
        } label: {
            HStack {
                Text("Daily Cost")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)
                Spacer()
                Text("7d")
                    .font(.caption2.weight(.medium))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(.quaternary)
                    .clipShape(RoundedRectangle(cornerRadius: 4))
            }
        }
    }

    private static let isoFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()

    private static let weekdayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "EEE" // Mon, Tue, ...
        f.locale = Locale.current
        return f
    }()

    private func weekdayLabel(_ date: String) -> String {
        guard let d = Self.isoFormatter.date(from: date) else { return date }
        if Calendar.current.isDateInToday(d) { return "Today" }
        if Calendar.current.isDateInYesterday(d) { return "Yest." }
        return Self.weekdayFormatter.string(from: d)
    }
}
