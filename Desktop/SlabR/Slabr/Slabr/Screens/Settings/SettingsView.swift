import SwiftUI
import CoreData

struct SettingsView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.managedObjectContext) private var context
    @StateObject private var viewModel = SettingsViewModel()
    @State private var blockedFeature: AccessControl.Feature?
    @State private var showDeleteConfirmation = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                Text("Settings")
                    .font(.sectionHeader)
                    .foregroundColor(.labelPrimary)
                    .padding(.horizontal, Spacing.screenMargin)

                settingsRows
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

    // MARK: - Settings Rows List

    private var settingsRows: some View {
        VStack(spacing: Spacing.cardGap) {
            trialStatusRow

            NavigationLink {
                SubscriptionView()
            } label: {
                settingsRow(icon: "creditcard.fill", title: "Subscription")
            }

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

            NavigationLink {
                EbayAccountView()
            } label: {
                ebayAccountRow
            }
            settingsRow(icon: "person.crop.circle", title: "PSA account")

            sellerModeRow

            // MARK: - Data Management (visible in all builds)
            Button(role: .destructive) {
                showDeleteConfirmation = true
            } label: {
                settingsRow(icon: "trash", title: "Delete All Data")
            }
            .alert("Delete All Data?", isPresented: $showDeleteConfirmation) {
                Button("Cancel", role: .cancel) {}
                Button("Delete Everything", role: .destructive) {
                    viewModel.deleteAllData(context: context, appState: appState)
                }
            } message: {
                Text("This will permanently delete all your cards, listings, settings, and account connections. This cannot be undone.")
            }

            #if DEBUG
            debugSection
            #endif
        }
        .padding(.horizontal, Spacing.screenMargin)
    }

    // MARK: - Trial Status

    @ViewBuilder
    private var trialStatusRow: some View {
        let tier = viewModel.currentTier(userId: appState.userId)
        if tier > .free && tier != .lifetime && !viewModel.isTrialActive() {
            // Active subscriber
            HStack(spacing: 0) {
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color.positive)
                    .frame(width: 3)
                    .padding(.vertical, Spacing.sm)

                HStack(spacing: Spacing.md) {
                    Image(systemName: "crown.fill")
                        .foregroundColor(.positive)
                        .frame(width: 28)
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("\(tier.displayName) Plan")
                            .font(.cardTitle)
                            .foregroundColor(.labelPrimary)
                        Text("Active subscription")
                            .font(.cardMeta)
                            .foregroundColor(.positive)
                    }
                    Spacer()
                }
                .padding(Spacing.cardPadding)
            }
            .background(Color.positive.opacity(0.06))
            .clipShape(RoundedRectangle(cornerRadius: 16))
        } else if viewModel.isTrialActive() {
            let daysLeft = viewModel.trialDaysRemaining()
            let trialColor: Color = daysLeft <= 1 ? .negative : daysLeft <= 3 ? .warning : .brandAccent
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
        } else if tier == .free {
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

    // MARK: - eBay Account Row

    private var ebayAccountRow: some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: "link")
                .foregroundColor(.brandAccent)
                .frame(width: 28)
            Text("eBay account")
                .font(.cardTitle)
                .foregroundColor(.labelPrimary)
            if viewModel.isEbayLinked {
                Circle()
                    .fill(Color.positive)
                    .frame(width: 8, height: 8)
            }
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
