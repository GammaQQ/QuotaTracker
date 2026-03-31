import SwiftUI

struct StatCardView: View {
    let title: String
    let icon: String
    let tokens: Int
    let cost: Double
    var tint: Color = .blue

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 10))
                    .foregroundStyle(tint)
                Text(title)
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Text(formattedTokens)
                .font(.callout.monospacedDigit().weight(.bold))
                .foregroundStyle(.primary)
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            Text(formattedCost)
                .font(.caption2.monospacedDigit().weight(.medium))
                .foregroundStyle(tint)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding(10)
        .background(tint.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .strokeBorder(tint.opacity(0.15), lineWidth: 1)
        )
    }

    private var formattedTokens: String {
        if tokens >= 1_000_000 {
            return String(format: "%.1fM", Double(tokens) / 1_000_000)
        } else if tokens >= 1_000 {
            return String(format: "%.1fK", Double(tokens) / 1_000)
        }
        return "\(tokens)"
    }

    private var formattedCost: String {
        if cost >= 1.0 {
            return String(format: "$%.2f", cost)
        }
        return String(format: "$%.3f", cost)
    }
}
