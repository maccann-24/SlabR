import SwiftUI

struct OnboardingCompleteStep: View {
    let scannedRecord: ListingRecord?
    let onFinish: () -> Void
    let onContinueToListing: (ListingRecord) -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var appeared = false
    @State private var checkmarkScale: CGFloat = 0.5

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 72))
                .foregroundColor(.brandAccent)
                .scaleEffect(checkmarkScale)
                .opacity(appeared ? 1 : 0)

            Text("You're all set")
                .font(.heroNumber)
                .foregroundColor(.labelPrimary)
                .padding(.top, Spacing.lg)
                .opacity(appeared ? 1 : 0)
                .offset(y: appeared ? 0 : 8)
                .animation(Motion.contentReveal(reduceMotion: reduceMotion, delay: 0.3), value: appeared)

            HStack(spacing: Spacing.sm) {
                Image(systemName: "star.fill")
                    .foregroundColor(.brandAccent)
                Text("7-day free trial — all features unlocked")
                    .font(.cardMeta)
                    .foregroundColor(.labelSecondary)
            }
            .padding(.top, Spacing.md)
            .opacity(appeared ? 1 : 0)
            .animation(Motion.contentReveal(reduceMotion: reduceMotion, delay: 0.4), value: appeared)

            Spacer().frame(height: Spacing.xl)

            VStack(alignment: .leading, spacing: Spacing.md) {
                capabilityRow(icon: "camera.fill", text: "Scan and identify cards instantly")
                capabilityRow(icon: "doc.text.fill", text: "Create eBay-ready listings")
                capabilityRow(icon: "chart.bar.fill", text: "Track your inventory and sales")
            }
            .padding(.horizontal, Spacing.xl)
            .opacity(appeared ? 1 : 0)
            .animation(Motion.contentReveal(reduceMotion: reduceMotion, delay: 0.5), value: appeared)

            Spacer()

            VStack(spacing: Spacing.sm) {
                if let record = scannedRecord {
                    PrimaryButton("Continue to listing") {
                        onContinueToListing(record)
                    }
                    Button("Go to dashboard") { onFinish() }
                        .font(.cardMeta)
                        .foregroundColor(.labelSecondary)
                } else {
                    PrimaryButton("Start listing", action: onFinish)
                }
            }
            .padding(.horizontal, Spacing.screenMargin)
            .padding(.bottom, Spacing.xl)
            .opacity(appeared ? 1 : 0)
            .animation(Motion.contentReveal(reduceMotion: reduceMotion, delay: 0.6), value: appeared)
        }
        .onAppear {
            appeared = true
            HapticManager.shared.postSuccess()
            withAnimation(
                reduceMotion
                    ? .linear(duration: 0)
                    : .spring(response: 0.6, dampingFraction: 0.6).delay(0.1)
            ) {
                checkmarkScale = 1.0
            }
        }
    }

    private func capabilityRow(icon: String, text: String) -> some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: icon)
                .font(.body)
                .foregroundColor(.brandAccent)
                .frame(width: 24)
            Text(text)
                .font(.cardMeta)
                .foregroundColor(.labelPrimary)
        }
    }
}
