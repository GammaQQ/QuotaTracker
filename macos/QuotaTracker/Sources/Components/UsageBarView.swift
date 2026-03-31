import SwiftUI

struct UsageBarView: View {
    let title: String
    let icon: String
    let utilization: Double
    var delta: Double? = nil
    var resetsIn: String? = nil
    var resetsAt: String? = nil
    var paceLabel: String? = nil
    var tint: Color = .green

    private var pct: Int { Int(utilization * 100) }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Row 1: icon + title + pct + delta
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(title)
                    .font(.subheadline.weight(.semibold))
                Spacer()
                Text("\(pct)%")
                    .font(.subheadline.monospacedDigit().weight(.bold))
                    .foregroundStyle(barColor)
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
        }
        .padding(10)
        .background(.quaternary.opacity(0.5))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private func deltaView(_ d: Double) -> some View {
        let absPct = Int(abs(d) * 100)
        let isUp = d > 0
        return Text("\(isUp ? "▲" : "▼")\(absPct)%")
            .font(.caption2.monospacedDigit().weight(.medium))
            .foregroundStyle(isUp ? .red : .green)
    }

    private var barColor: Color {
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
}
