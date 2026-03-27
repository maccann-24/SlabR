import SwiftUI

struct SubscriptionView: View {
    @EnvironmentObject private var subscriptionService: SubscriptionService
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = SubscriptionViewModel()
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var showUpgradeSheet = false
    @State private var appeared = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                header
                content
            }
            .padding(.top, Spacing.md)
        }
        .background(Color.appBackground)
        .toolbar(.hidden, for: .navigationBar)
        .onAppear {
            viewModel.loadStatus(subscriptionService: subscriptionService, userId: appState.userId)
            appeared = true
        }
        .sheet(isPresented: $showUpgradeSheet) {
            UpgradeSheet(feature: .psaImport)
                .presentationDetents([.medium])
        }
        .alert("Restore Purchases", isPresented: .constant(viewModel.restoreMessage != nil)) {
            Button("OK") { viewModel.restoreMessage = nil }
        } message: {
            Text(viewModel.restoreMessage ?? "")
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            Button(action: { dismiss() }) {
                Image(systemName: "chevron.left")
                    .foregroundColor(.labelPrimary)
                    .font(.body.weight(.semibold))
            }
            Spacer()
            Text("Subscription")
                .font(.sectionHeader)
                .foregroundColor(.labelPrimary)
            Spacer()
            // Balance spacer
            Image(systemName: "chevron.left")
                .foregroundColor(.clear)
                .font(.body.weight(.semibold))
        }
        .padding(.horizontal, Spacing.screenMargin)
    }

    // MARK: - Content

    private var content: some View {
        VStack(spacing: Spacing.cardGap) {
            currentPlanCard
            actionsCard
            restorePurchasesButton
        }
        .padding(.horizontal, Spacing.screenMargin)
    }

    // MARK: - Current Plan Card

    private var currentPlanCard: some View {
        VStack(spacing: Spacing.lg) {
            planIcon

            VStack(spacing: Spacing.sm) {
                Text(viewModel.currentPlanName)
                    .font(.sectionHeader)
                    .foregroundColor(.labelPrimary)

                if viewModel.isSubscribed {
                    HStack(spacing: Spacing.sm) {
                        Text("Active")
                            .font(.captionMedium)
                            .foregroundColor(.positive)
                            .padding(.horizontal, Spacing.sm)
                            .padding(.vertical, Spacing.xs)
                            .background(Color.positive.opacity(0.12))
                            .clipShape(Capsule())
                    }
                } else if AccessControl.isTrialActive() {
                    let daysLeft = AccessControl.trialDaysRemaining()
                    HStack(spacing: Spacing.sm) {
                        Text("Trial \u{2014} \(daysLeft) day\(daysLeft == 1 ? "" : "s") left")
                            .font(.captionMedium)
                            .foregroundColor(.brandAccent)
                            .padding(.horizontal, Spacing.sm)
                            .padding(.vertical, Spacing.xs)
                            .background(Color.brandAccent.opacity(0.12))
                            .clipShape(Capsule())
                    }
                } else {
                    Text("No active subscription")
                        .font(.cardMeta)
                        .foregroundColor(.labelSecondary)
                }

                if let renewal = viewModel.renewalDate {
                    Text("Renews \(renewal)")
                        .font(.cardMeta)
                        .foregroundColor(.labelSecondary)
                }
            }

            if viewModel.isSubscribed {
                tierBenefits
            }
        }
        .padding(Spacing.xl)
        .frame(maxWidth: .infinity)
        .background(Color.cardSurface)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 8)
        .animation(Motion.contentReveal(reduceMotion: reduceMotion, delay: 0.1), value: appeared)
    }

    // MARK: - Plan Icon

    private var planIcon: some View {
        ZStack {
            RadialGradient(
                colors: [Color.brandAccent.opacity(0.08), Color.clear],
                center: .center,
                startRadius: 10,
                endRadius: 60
            )
            .frame(width: 120, height: 120)

            Image(systemName: viewModel.isSubscribed ? "crown.fill" : "sparkles")
                .font(.system(size: 48))
                .foregroundColor(.brandAccent)
        }
    }

    // MARK: - Tier Benefits

    private var tierBenefits: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            benefitRow("PSA scan import & camera capture")
            benefitRow("Publish directly to eBay")

            let tier = AccessControl.currentTier(userId: appState.userId)
            if tier >= .seller {
                benefitRow("Speed mode & batch imports")
                benefitRow("Listing templates")
            }
            if tier >= .pro {
                benefitRow("AI pricing suggestions")
            }
            if tier >= .power {
                benefitRow("Analytics export & multi-store")
            }
        }
        .padding(Spacing.cardPadding)
        .background(Color.elevatedSurface)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Actions Card

    private var actionsCard: some View {
        VStack(spacing: Spacing.cardGap) {
            if viewModel.isSubscribed {
                PrimaryButton("Manage Subscription") {
                    viewModel.openManageSubscriptions()
                }
            } else {
                PrimaryButton("Choose a Plan") {
                    showUpgradeSheet = true
                }
            }
        }
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 8)
        .animation(Motion.contentReveal(reduceMotion: reduceMotion, delay: 0.2), value: appeared)
    }

    // MARK: - Restore Purchases

    private var restorePurchasesButton: some View {
        Button {
            Task {
                await viewModel.restorePurchases(subscriptionService: subscriptionService)
                viewModel.loadStatus(subscriptionService: subscriptionService, userId: appState.userId)
            }
        } label: {
            HStack(spacing: Spacing.md) {
                if viewModel.isRestoring {
                    ProgressView()
                        .controlSize(.small)
                        .tint(.brandAccent)
                } else {
                    Image(systemName: "arrow.clockwise")
                        .foregroundColor(.brandAccent)
                }
                Text("Restore Purchases")
                    .font(.cardTitle)
                    .foregroundColor(.brandAccent)
            }
            .frame(maxWidth: .infinity)
            .padding(Spacing.cardPadding)
            .background(Color.cardSurface)
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
        .disabled(viewModel.isRestoring)
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 8)
        .animation(Motion.contentReveal(reduceMotion: reduceMotion, delay: 0.3), value: appeared)
    }

    // MARK: - Helpers

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
