import SwiftUI
import CoreData

struct SettingsView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.managedObjectContext) private var context
    @StateObject private var viewModel = SettingsViewModel()
    @State private var blockedFeature: AccessControl.Feature?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                Text("Settings")
                    .font(.sectionHeader)
                    .foregroundColor(.labelPrimary)
                    .padding(.horizontal, Spacing.screenMargin)

                VStack(spacing: Spacing.cardGap) {
                    // Trial status
                    trialStatusRow

                    NavigationLink {
                        ListingDefaultsView(
                            viewModel: ListingDefaultsViewModel(context: context, userId: appState.userId)
                        )
                    } label: {
                        settingsRow(icon: "tag.fill", title: "Listing defaults")
                    }

                    NavigationLink {
                        ShippingProfilesView(
                            viewModel: ShippingProfilesViewModel(context: context, userId: appState.userId)
                        )
                    } label: {
                        settingsRow(icon: "shippingbox.fill", title: "Shipping profiles")
                    }

                    settingsRow(icon: "link", title: "eBay account")
                    settingsRow(icon: "person.crop.circle", title: "PSA account")

                    sellerModeRow

                    #if DEBUG
                    debugSection
                    #endif
                }
                .padding(.horizontal, Spacing.screenMargin)
            }
            .padding(.top, Spacing.md)
        }
        .background(Color.appBackground)
        .toolbar(.hidden, for: .navigationBar)
        .onAppear {
            viewModel.configure(context: context, userId: appState.userId)
            viewModel.loadSellerMode()
        }
        .sheet(item: $blockedFeature) { feature in
            UpgradeSheet(feature: feature)
                .presentationDetents([.medium])
        }
    }

    // MARK: - Trial Status

    @ViewBuilder
    private var trialStatusRow: some View {
        let daysLeft = viewModel.trialDaysRemaining()
        let trialColor: Color = daysLeft <= 1 ? .negative : daysLeft <= 3 ? .warning : .brandAccent
        if viewModel.isTrialActive() {
            HStack(spacing: 0) {
                RoundedRectangle(cornerRadius: 2)
                    .fill(trialColor)
                    .frame(width: 3)
                    .padding(.vertical, Spacing.sm)

                HStack(spacing: Spacing.md) {
                    Image(systemName: "gift.fill")
                        .foregroundColor(trialColor)
                        .frame(width: 28)
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("Free Trial")
                            .font(.cardTitle)
                            .foregroundColor(.labelPrimary)
                        Text("\(daysLeft) day\(daysLeft == 1 ? "" : "s") remaining")
                            .font(.cardMeta)
                            .foregroundColor(trialColor)
                    }
                    Spacer()
                }
                .padding(Spacing.cardPadding)
            }
            .background(Color.brandAccentFaint)
            .clipShape(RoundedRectangle(cornerRadius: 16))
        } else if viewModel.currentTier(userId: appState.userId) == .free {
            HStack(spacing: Spacing.md) {
                Image(systemName: "lock.fill")
                    .foregroundColor(.labelSecondary)
                    .frame(width: 28)
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("Trial Ended")
                        .font(.cardTitle)
                        .foregroundColor(.labelPrimary)
                    Text("Upgrade to unlock all features")
                        .font(.cardMeta)
                        .foregroundColor(.labelSecondary)
                }
                Spacer()
            }
            .padding(Spacing.cardPadding)
            .background(Color.cardSurface)
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
    }

    // MARK: - Settings Rows

    private func settingsRow(icon: String, title: String) -> some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: icon)
                .foregroundColor(.brandAccent)
                .frame(width: 28)
            Text(title)
                .font(.cardTitle)
                .foregroundColor(.labelPrimary)
            Spacer()
            Image(systemName: "chevron.right")
                .foregroundColor(.labelSecondary)
                .font(.caption)
        }
        .padding(Spacing.cardPadding)
        .background(Color.cardSurface)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    // MARK: - Seller Mode

    private var sellerModeRow: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack(spacing: Spacing.md) {
                Image(systemName: "speedometer")
                    .foregroundColor(.brandAccent)
                    .frame(width: 28)
                Text("Seller mode")
                    .font(.cardTitle)
                    .foregroundColor(.labelPrimary)
                Spacer()
            }
            HStack(spacing: Spacing.sm) {
                ForEach(SellerMode.allCases, id: \.rawValue) { mode in
                    FilterChip(title: mode.displayName, isSelected: viewModel.sellerMode == mode) {
                        if mode == .highVolume && !viewModel.canAccessSpeedMode(userId: appState.userId) {
                            blockedFeature = .speedMode
                        } else {
                            viewModel.saveSellerMode(mode)
                        }
                    }
                }
            }
        }
        .padding(Spacing.cardPadding)
        .background(Color.cardSurface)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    // MARK: - Debug

    #if DEBUG
    private var debugSection: some View {
        VStack(spacing: Spacing.cardGap) {
            Text("Debug")
                .font(.captionMedium)
                .foregroundColor(.negative)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.top, Spacing.lg)

            Button {
                SeedData.populate(context: context, userId: appState.userId)
            } label: {
                settingsRow(icon: "tray.full.fill", title: "Seed mock data")
            }

            Button {
                SeedData.clear(context: context, userId: appState.userId)
            } label: {
                settingsRow(icon: "trash.fill", title: "Clear all data")
            }

            Button {
                KeychainHelper.delete(key: KeychainKey.onboardingCompleted)
                appState.hasCompletedOnboarding = false
            } label: {
                settingsRow(icon: "arrow.counterclockwise", title: "Reset onboarding")
            }
        }
    }
    #endif
}
