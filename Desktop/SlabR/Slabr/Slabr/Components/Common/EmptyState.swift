import SwiftUI

struct EmptyState: View {
    let icon: String
    let title: String
    let message: String
    var ctaTitle: String? = nil
    var ctaAction: (() -> Void)? = nil

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var appeared = false

    var body: some View {
        VStack(spacing: Spacing.md) {
            ZStack {
                // Subtle radial gradient for atmosphere
                RadialGradient(
                    colors: [Color.brandAccent.opacity(0.08), Color.clear],
                    center: .center,
                    startRadius: 10,
                    endRadius: 80
                )
                .frame(width: 160, height: 160)

                Image(systemName: icon)
                    .font(.system(size: 56))
                    .foregroundColor(.labelSecondary)
            }
            .opacity(appeared ? 1 : 0)
            .offset(y: appeared ? 0 : 8)
            .animation(Motion.contentReveal(reduceMotion: reduceMotion, delay: 0.1), value: appeared)

            Text(title)
                .font(.sectionHeader)
                .foregroundColor(.labelPrimary)
                .opacity(appeared ? 1 : 0)
                .offset(y: appeared ? 0 : 8)
                .animation(Motion.contentReveal(reduceMotion: reduceMotion, delay: 0.2), value: appeared)

            Text(message)
                .font(.caption)
                .foregroundColor(.labelSecondary)
                .multilineTextAlignment(.center)
                .opacity(appeared ? 1 : 0)
                .offset(y: appeared ? 0 : 8)
                .animation(Motion.contentReveal(reduceMotion: reduceMotion, delay: 0.3), value: appeared)

            if let ctaTitle, let ctaAction {
                PrimaryButton(ctaTitle, action: ctaAction)
                    .padding(.top, Spacing.sm)
                    .opacity(appeared ? 1 : 0)
                    .offset(y: appeared ? 0 : 8)
                    .animation(Motion.contentReveal(reduceMotion: reduceMotion, delay: 0.4), value: appeared)
            }
        }
        .padding(Spacing.xl)
        .onAppear { appeared = true }
    }
}
