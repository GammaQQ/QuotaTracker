import SwiftUI

/// Token usage table with per-model breakdowns and percentage bars.
struct TokenTable: View {
    let breakdowns: [ModelBreakdown]
    let totalCost: Double

    private var totalTokens: Int {
        breakdowns.reduce(0) { $0 + $1.totalTokens }
    }

    private var sorted: [ModelBreakdown] {
        breakdowns.sorted { $0.totalTokens > $1.totalTokens }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header
            HStack(spacing: 6) {
                Image(systemName: "number")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text("Token Usage")
                    .font(.subheadline.weight(.semibold))
                Spacer()
                Text(String(format: "$%.2f", totalCost))
                    .font(.caption.monospacedDigit().weight(.semibold))
                    .foregroundStyle(.secondary)
            }

            // Column headers
            HStack {
                Text("Model")
                    .frame(maxWidth: .infinity, alignment: .leading)
                Text("Input")
                    .frame(width: 56, alignment: .trailing)
                Text("Output")
                    .frame(width: 56, alignment: .trailing)
                Text("Cache")
                    .frame(width: 56, alignment: .trailing)
                Text("Cost")
                    .frame(width: 60, alignment: .trailing)
            }
            .font(.caption2.weight(.medium))
            .foregroundStyle(.tertiary)

            Divider()

            // Model rows
            ForEach(sorted) { model in
                VStack(spacing: 4) {
                    HStack {
                        ModelBadge(name: model.model)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        Text(fmtTokens(model.inputTokens))
                            .frame(width: 56, alignment: .trailing)
                        Text(fmtTokens(model.outputTokens))
                            .frame(width: 56, alignment: .trailing)
                        Text(fmtTokens(model.cacheReadTokens + model.cacheCreationTokens))
                            .frame(width: 56, alignment: .trailing)
                        Text(String(format: "$%.2f", model.cost))
                            .frame(width: 60, alignment: .trailing)
                    }
                    .font(.caption.monospacedDigit())

                    // Percentage bar
                    GeometryReader { geo in
                        let pct = totalTokens > 0 ? Double(model.totalTokens) / Double(totalTokens) : 0
                        HStack(spacing: 4) {
                            RoundedRectangle(cornerRadius: 2)
                                .fill(modelColor(model.model).gradient)
                                .frame(width: max(0, geo.size.width * 0.85 * pct))
                            Text("\(Int(pct * 100))%")
                                .font(.system(size: 9).monospacedDigit())
                                .foregroundStyle(.tertiary)
                        }
                    }
                    .frame(height: 12)
                }
                .padding(.vertical, 2)
            }

            Divider()

            // Total row
            HStack {
                Text("Total")
                    .font(.caption.weight(.semibold))
                    .frame(maxWidth: .infinity, alignment: .leading)
                Text(fmtTokens(sorted.reduce(0) { $0 + $1.inputTokens }))
                    .frame(width: 56, alignment: .trailing)
                Text(fmtTokens(sorted.reduce(0) { $0 + $1.outputTokens }))
                    .frame(width: 56, alignment: .trailing)
                Text(fmtTokens(sorted.reduce(0) { $0 + $1.cacheReadTokens + $1.cacheCreationTokens }))
                    .frame(width: 56, alignment: .trailing)
                Text(String(format: "$%.2f", totalCost))
                    .frame(width: 60, alignment: .trailing)
            }
            .font(.caption.monospacedDigit().weight(.semibold))
        }
        .padding(10)
        .background(.quaternary.opacity(0.5))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private func fmtTokens(_ count: Int) -> String {
        if count >= 1_000_000_000 { return String(format: "%.1fB", Double(count) / 1e9) }
        if count >= 1_000_000 { return String(format: "%.1fM", Double(count) / 1e6) }
        if count >= 1_000 { return String(format: "%.1fK", Double(count) / 1e3) }
        return "\(count)"
    }

    private func modelColor(_ name: String) -> Color {
        let lower = name.lowercased()
        if lower.contains("opus") { return .purple }
        if lower.contains("sonnet") { return .blue }
        if lower.contains("haiku") { return .green }
        return .gray
    }
}
