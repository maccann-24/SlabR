import SwiftUI

struct UpgradeSheet: View {
    let feature: AccessControl.Feature
    @Environment(\.dismiss) private var dismiss
    @State private var showComingSoon = false

    var body: some View {
        VStack(spacing: Spacing.lg) {
            DragHandle()

            Image(systemName: "lock.fill")
                .font(.system(size: 40))
                .foregroundColor(.brandAccent)

            Text(feature.displayName)
                .font(.sectionHeader)
                .foregroundColor(.labelPrimary)

            Text("Your free trial has ended. Upgrade to **\(feature.requiredTier.displayName)** to continue using this feature.")
                .font(.cardMeta)
                .foregroundColor(.labelSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.screenMargin)

            tierBenefits

            Spacer()

            VStack(spacing: Spacing.sm) {
                PrimaryButton("Subscribe to \(feature.requiredTier.displayName)") {
                    showComingSoon = true
                }
                Button("Not now") { dismiss() }
                    .font(.cardMeta)
                    .foregroundColor(.labelSecondary)
            }
            .padding(.horizontal, Spacing.screenMargin)
            .padding(.bottom, Spacing.md)
        }
        .padding(.top, Spacing.md)
        .background(Color.appBackground)
        .alert("Coming Soon", isPresented: $showComingSoon) {
            Button("OK") {}
        } message: {
            Text("Subscriptions will be available in a future update.")
        }
    }

    private var tierBenefits: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            benefitRow("PSA scan import & camera capture")
            benefitRow("Publish directly to eBay")
            if feature.requiredTier >= .seller {
                benefitRow("Speed mode & batch imports")
                benefitRow("Listing templates")
            }
            if feature.requiredTier >= .pro {
                benefitRow("AI pricing suggestions")
            }
            if feature.requiredTier >= .power {
                benefitRow("Analytics export & multi-store")
            }
        }
        .padding(Spacing.cardPadding)
        .background(Color.cardSurface)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .padding(.horizontal, Spacing.screenMargin)
    }

    private func benefitRow(_ text: String) -> some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundColor(.brandAccent)
                .font(.caption)
            Text(text)
                .font(.cardMeta)
                .foregroundColor(.labelPrimary)
        }
    }
}
