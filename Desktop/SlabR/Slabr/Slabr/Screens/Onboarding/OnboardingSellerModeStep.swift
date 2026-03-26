import SwiftUI
import CoreData

struct OnboardingSellerModeStep: View {
    let onContinue: () -> Void
    let onSkip: () -> Void

    @EnvironmentObject private var appState: AppState
    @Environment(\.managedObjectContext) private var context
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var selectedMode: SellerMode?
    @State private var appeared = false

    private let options: [(mode: SellerMode, icon: String, subtitle: String)] = [
        (.casual, "clock", "A few cards a month"),
        (.regular, "shippingbox", "Weekly listings"),
        (.highVolume, "bolt.fill", "Daily high-volume seller")
    ]

    var body: some View {
        VStack(spacing: 0) {
            Spacer().frame(height: Spacing.xl)
            sellerModeHeader
            Spacer().frame(height: Spacing.xl)
            sellerModeOptions
            Spacer()
            sellerModeActions
        }
        .onAppear { appeared = true }
    }

    // MARK: - Subviews

    private var sellerModeHeader: some View {
        VStack(spacing: 0) {
            Text("How do you sell?")
                .font(.sectionHeader)
                .foregroundColor(.labelPrimary)
                .opacity(appeared ? 1 : 0)
                .animation(Motion.contentReveal(reduceMotion: reduceMotion, delay: 0.1), value: appeared)

            Text("We'll tailor your experience.")
                .font(.cardMeta)
                .foregroundColor(.labelSecondary)
                .padding(.top, Spacing.sm)
                .opacity(appeared ? 1 : 0)
                .animation(Motion.contentReveal(reduceMotion: reduceMotion, delay: 0.2), value: appeared)
        }
    }

    private var sellerModeOptions: some View {
        VStack(spacing: Spacing.cardGap) {
            ForEach(Array(options.enumerated()), id: \.element.mode.rawValue) { index, option in
                sellerModeCard(option.mode, icon: option.icon, subtitle: option.subtitle)
                    .opacity(appeared ? 1 : 0)
                    .offset(y: appeared ? 0 : 12)
                    .animation(
                        Motion.contentReveal(reduceMotion: reduceMotion, delay: 0.3 + Double(index) * 0.1),
                        value: appeared
                    )
            }
        }
        .padding(.horizontal, Spacing.screenMargin)
    }

    private var sellerModeActions: some View {
        VStack(spacing: Spacing.sm) {
            PrimaryButton("Continue", isEnabled: selectedMode != nil) {
                if let mode = selectedMode {
                    saveSellerMode(mode)
                }
                onContinue()
            }

            Button("Skip") { onSkip() }
                .font(.cardMeta)
                .foregroundColor(.labelSecondary)
        }
        .padding(.horizontal, Spacing.screenMargin)
        .padding(.bottom, Spacing.xl)
        .opacity(appeared ? 1 : 0)
        .animation(Motion.contentReveal(reduceMotion: reduceMotion, delay: 0.6), value: appeared)
    }

    private func sellerModeCard(_ mode: SellerMode, icon: String, subtitle: String) -> some View {
        Button {
            HapticManager.shared.buttonTapped()
            withAnimation(Motion.buttonPress(reduceMotion: reduceMotion)) {
                selectedMode = mode
            }
        } label: {
            HStack(spacing: Spacing.md) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(.brandAccent)
                    .frame(width: 44, height: 44)
                    .background(Color.elevatedSurface)
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(mode.displayName)
                        .font(.cardTitle)
                        .foregroundColor(.labelPrimary)
                    Text(subtitle)
                        .font(.cardMeta)
                        .foregroundColor(.labelSecondary)
                }

                Spacer()

                Image(systemName: selectedMode == mode ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundColor(selectedMode == mode ? .brandAccent : .labelTertiary)
            }
            .padding(Spacing.cardPadding)
            .background(Color.cardSurface)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .strokeBorder(selectedMode == mode ? Color.brandAccent : Color.clear, lineWidth: 2)
            )
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
        .accessibilityLabel("\(mode.displayName) — \(subtitle)")
    }

    private func saveSellerMode(_ mode: SellerMode) {
        guard let entity = SettingsViewModel.fetchOrCreateSettings(context: context, userId: appState.userId) else { return }
        entity.sellerMode = mode.rawValue
        do {
            try context.save()
        } catch {
            Log.onboarding.error("Failed to save seller mode: \(error)")
        }
    }
}
