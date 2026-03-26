import SwiftUI

/// Metric tile for the Dashboard grid. Displays a large number + label
/// with an optional trend indicator. Default 16pt radius for stat tiles;
/// use 20pt radius + tileColor for action tiles.
struct StatCard: View {
    let value: String
    let label: String
    var trendText: String? = nil
    var trendColor: Color = .positive
    var tileColor: Color = .cardSurface
    var cornerRadius: CGFloat = 16

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
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
    }
}
