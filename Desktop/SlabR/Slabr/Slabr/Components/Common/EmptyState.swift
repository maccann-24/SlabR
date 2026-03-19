import SwiftUI

struct EmptyState: View {
    let icon: String
    let title: String
    let message: String

    var body: some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: 48))
                .foregroundColor(.labelSecondary)
            Text(title)
                .font(.sectionHeader)
                .foregroundColor(.labelPrimary)
            Text(message)
                .font(.caption)
                .foregroundColor(.labelSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(Spacing.xl)
    }
}
