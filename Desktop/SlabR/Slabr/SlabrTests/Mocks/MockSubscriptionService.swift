import Foundation
import StoreKit
@testable import Slabr

@MainActor
final class MockSubscriptionService: SubscriptionServiceProtocol {
    var currentTier: AccessControl.SubscriptionTier = .free
    var availableProducts: [Product] = []
    var purchaseCallCount = 0
    var restoreCallCount = 0

    nonisolated func loadProducts() async {}

    nonisolated func purchase(_ product: Product) async throws -> Transaction? {
        await MainActor.run { purchaseCallCount += 1 }
        return nil
    }

    nonisolated func restorePurchases() async {
        await MainActor.run { restoreCallCount += 1 }
    }
}
