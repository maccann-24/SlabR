import SwiftUI
import CoreData

struct SettingsView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.managedObjectContext) private var context
    @State private var sellerMode: SellerMode = .standard
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
                }
                .padding(.horizontal, Spacing.screenMargin)
            }
            .padding(.top, Spacing.md)
        }
        .background(Color.appBackground)
        .toolbar(.hidden, for: .navigationBar)
        .onAppear { loadSellerMode() }
        .sheet(item: $blockedFeature) { feature in
            UpgradeSheet(feature: feature)
                .presentationDetents([.medium])
        }
    }

    // MARK: - Trial Status

    @ViewBuilder
    private var trialStatusRow: some View {
        let daysLeft = AccessControl.trialDaysRemaining()
        let trialColor: Color = daysLeft <= 1 ? .negative : daysLeft <= 3 ? .warning : .brandAccent
        if AccessControl.isTrialActive() {
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
        } else if AccessControl.currentTier(userId: appState.userId) == .free {
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
                    FilterChip(title: mode.displayName, isSelected: sellerMode == mode) {
                        if mode == .speed && !AccessControl.hasAccess(userId: appState.userId, feature: .speedMode) {
                            blockedFeature = .speedMode
                        } else {
                            sellerMode = mode
                            saveSellerMode(mode)
                        }
                    }
                }
            }
        }
        .padding(Spacing.cardPadding)
        .background(Color.cardSurface)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func loadSellerMode() {
        let request = NSFetchRequest<UserSettingsEntity>(entityName: "UserSettingsEntity")
        request.predicate = NSPredicate(format: "userId == %@", appState.userId)
        request.fetchLimit = 1
        do {
            if let entity = try context.fetch(request).first {
                sellerMode = SellerMode(rawValue: entity.sellerMode ?? "standard") ?? .standard
            }
        } catch {
            Log.settings.error("Failed to load seller mode: \(error)")
        }
    }

    private func saveSellerMode(_ mode: SellerMode) {
        let request = NSFetchRequest<UserSettingsEntity>(entityName: "UserSettingsEntity")
        request.predicate = NSPredicate(format: "userId == %@", appState.userId)
        request.fetchLimit = 1
        let entity: UserSettingsEntity
        do {
            if let existing = try context.fetch(request).first {
                entity = existing
            } else {
                entity = UserSettingsEntity(context: context)
                entity.userId = appState.userId
            }
            entity.sellerMode = mode.rawValue
            try context.save()
        } catch {
            Log.settings.error("Failed to save seller mode: \(error)")
        }
    }
}
