import SwiftUI

struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.captionMedium)
                .foregroundColor(isSelected ? .white : .labelSecondary)
                .padding(.horizontal, 14)
                .padding(.vertical, Spacing.sm)
                .background(isSelected ? Color.brandAccent : Color.elevatedSurface)
                .clipShape(Capsule())
        }
    }
}
