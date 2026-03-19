import SwiftUI

struct OnboardingWelcomeStep: View {
    let onContinue: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var appeared = false

    private let valueBullets: [(icon: String, text: String)] = [
        ("viewfinder", "Identify any card in seconds"),
        ("tag.fill", "Auto-generate listing details"),
        ("bolt.fill", "List to eBay with one tap")
    ]

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(spacing: Spacing.md) {
                Image(systemName: "square.stack.3d.up.fill")
                    .font(.system(size: 64))
                    .foregroundColor(.brandAccent)
                    .opacity(appeared ? 1 : 0)
                    .scaleEffect(appeared ? 1 : 0.8)
                    .animation(Motion.contentReveal(reduceMotion: reduceMotion, delay: 0.1), value: appeared)

                Text("Slabr")
                    .font(.system(size: 34, weight: .bold))
                    .foregroundColor(.labelPrimary)
                    .opacity(appeared ? 1 : 0)
                    .offset(y: appeared ? 0 : 8)
                    .animation(Motion.contentReveal(reduceMotion: reduceMotion, delay: 0.2), value: appeared)

                Text("Scan. Price. List.")
                    .font(.sectionHeader)
                    .foregroundColor(.brandAccent)
                    .opacity(appeared ? 1 : 0)
                    .offset(y: appeared ? 0 : 8)
                    .animation(Motion.contentReveal(reduceMotion: reduceMotion, delay: 0.3), value: appeared)
            }

            Spacer().frame(height: Spacing.xl)

            VStack(alignment: .leading, spacing: Spacing.lg) {
                ForEach(Array(valueBullets.enumerated()), id: \.offset) { index, bullet in
                    HStack(spacing: Spacing.md) {
                        Image(systemName: bullet.icon)
                            .font(.title3)
                            .foregroundColor(.brandAccent)
                            .frame(width: 32, height: 32)

                        Text(bullet.text)
                            .font(.cardTitle)
                            .foregroundColor(.labelPrimary)
                    }
                    .opacity(appeared ? 1 : 0)
                    .offset(y: appeared ? 0 : 8)
                    .animation(
                        Motion.contentReveal(reduceMotion: reduceMotion, delay: 0.4 + Double(index) * 0.1),
                        value: appeared
                    )
                }
            }
            .padding(.horizontal, Spacing.xl)

            Spacer()

            PrimaryButton("Get started", action: onContinue)
                .padding(.horizontal, Spacing.screenMargin)
                .padding(.bottom, Spacing.xl)
                .opacity(appeared ? 1 : 0)
                .animation(Motion.contentReveal(reduceMotion: reduceMotion, delay: 0.7), value: appeared)
        }
        .onAppear { appeared = true }
    }
}
