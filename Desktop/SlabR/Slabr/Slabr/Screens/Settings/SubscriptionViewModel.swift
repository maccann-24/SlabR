import Foundation
import StoreKit
import os

@MainActor
final class SubscriptionViewModel: ObservableObject {
    @Published var currentPlanName: String = "Free"
    @Published var renewalDate: String?
    @Published var isSubscribed: Bool = false
    @Published var isRestoring: Bool = false
    @Published var restoreMessage: String?

    // MARK: - Load Status

    func loadStatus(subscriptionService: SubscriptionService, userId: String) {
        let tier = AccessControl.currentTier(userId: userId)
        currentPlanName = tier.displayName
        isSubscribed = tier > .free && tier != .lifetime

        // Check for lifetime separately — lifetime users are "subscribed" but have no renewal
        if tier == .lifetime {
            isSubscribed = false
            currentPlanName = "Lifetime"
        }

        Task {
            await loadRenewalDate()
        }
    }

    // MARK: - Restore Purchases

    func restorePurchases(subscriptionService: SubscriptionService) async {
        isRestoring = true
        defer { isRestoring = false }

        await subscriptionService.restorePurchases()

        let restoredTier = subscriptionService.currentTier
        if restoredTier > .free {
            currentPlanName = restoredTier.displayName
            isSubscribed = true
            restoreMessage = "Purchases restored successfully."
            HapticManager.shared.success()
            Log.subscription.info("Restore succeeded — tier: \(String(describing: restoredTier))")
        } else {
            restoreMessage = "No previous purchases found."
            HapticManager.shared.warning()
            Log.subscription.info("Restore completed — no active subscriptions found")
        }
    }

    // MARK: - Manage Subscriptions

    func openManageSubscriptions() {
        guard let url = URL(string: "https://apps.apple.com/account/subscriptions") else { return }
        UIApplication.shared.open(url)
        Log.subscription.info("Opened Apple subscription management")
    }

    // MARK: - Private

    private func loadRenewalDate() async {
        for await result in Transaction.currentEntitlements {
            if let transaction = try? result.payloadValue,
               let expirationDate = transaction.expirationDate {
                let formatter = DateFormatter()
                formatter.dateStyle = .medium
                formatter.timeStyle = .none
                renewalDate = formatter.string(from: expirationDate)
                return
            }
        }
        renewalDate = nil
    }
}
