import StoreKit
import os

// MARK: - Protocol

protocol SubscriptionServiceProtocol: AnyObject, Sendable {
    @MainActor var currentTier: AccessControl.SubscriptionTier { get }
    @MainActor var availableProducts: [Product] { get }
    func loadProducts() async
    func purchase(_ product: Product) async throws -> Transaction?
    func restorePurchases() async
}

// MARK: - Implementation

@MainActor
final class SubscriptionService: ObservableObject, SubscriptionServiceProtocol {
    @Published private(set) var currentTier: AccessControl.SubscriptionTier = .free
    @Published private(set) var availableProducts: [Product] = []
    @Published private(set) var isLoading = false

    private var transactionListener: Task<Void, Never>?

    init() {
        transactionListener = listenForTransactions()
    }

    deinit {
        transactionListener?.cancel()
    }

    // MARK: - Public

    func loadProducts() async {
        do {
            let products = try await Product.products(for: SlabrProduct.allProductIds)
            availableProducts = products.sorted { $0.price < $1.price }
            Log.subscription.info("Loaded \(products.count) products")
        } catch {
            Log.subscription.error("Failed to load products: \(error)")
        }
    }

    func purchase(_ product: Product) async throws -> Transaction? {
        isLoading = true
        defer { isLoading = false }

        let result = try await product.purchase()
        switch result {
        case .success(let verification):
            let transaction = try checkVerified(verification)
            await transaction.finish()
            await updateCurrentTier()
            Log.subscription.info("Purchase completed: \(product.id)")
            return transaction
        case .userCancelled:
            Log.subscription.info("Purchase cancelled by user")
            return nil
        case .pending:
            Log.subscription.info("Purchase pending approval")
            return nil
        @unknown default:
            return nil
        }
    }

    func restorePurchases() async {
        Log.subscription.info("Restoring purchases")
        try? await AppStore.sync()
        await updateCurrentTier()
    }

    // MARK: - Private

    private func listenForTransactions() -> Task<Void, Never> {
        Task.detached { [weak self] in
            for await result in Transaction.updates {
                do {
                    let transaction = try result.payloadValue
                    await transaction.finish()
                    await self?.updateCurrentTier()
                } catch {
                    Log.subscription.error("Transaction verification failed: \(error)")
                }
            }
        }
    }

    private func updateCurrentTier() async {
        var highestTier: AccessControl.SubscriptionTier = .free
        for await result in Transaction.currentEntitlements {
            do {
                let transaction = try result.payloadValue
                if let product = SlabrProduct(rawValue: transaction.productID) {
                    if product.tier > highestTier {
                        highestTier = product.tier
                    }
                }
            } catch {
                Log.subscription.error("Entitlement verification failed: \(error)")
            }
        }
        currentTier = highestTier
        Log.subscription.info("Subscription tier updated to \(String(describing: highestTier))")
    }

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified(_, let error):
            throw error
        case .verified(let safe):
            return safe
        }
    }
}
