import SwiftUI

/// Metric tile for the Dashboard 2×2 grid. Displays a large number + label
/// with an optional trend indicator. Uses 20pt corner radius per the action tile spec.
struct StatCard: View {
    let value: String
    let label: String
    var trendText: String? = nil
    var trendColor: Color = .positive
    var tileColor: Color = .cardSurface

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            HStack(alignment: .firstTextBaseline) {
                Text(value)
                    .font(.metricNumber)
                    .foregroundColor(.labelPrimary)
                if let trend = trendText, !trend.isEmpty {
                    Text(trend)
                        .font(.trendIndicator)
                        .foregroundColor(trendColor)
                }
            }
            Text(label)
                .font(.metricLabel)
                .foregroundColor(.labelSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Spacing.cardPadding)
        .background(tileColor)
        .clipShape(RoundedRectangle(cornerRadius: 20))
    }
}
