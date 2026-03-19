import SwiftUI

/// Wrapper for chart sections in the Analytics tab. Card-level container
/// with title and content slot.
struct ChartCard<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text(title)
                .font(.cardTitle)
                .foregroundColor(.labelPrimary)
            content()
        }
        .padding(Spacing.cardPadding)
        .background(Color.cardSurface)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}
