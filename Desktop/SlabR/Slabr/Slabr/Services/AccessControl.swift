import Foundation
import os

/// Feature gating based on subscription tiers. Defines 5 tiers (free → power)
/// plus a lifetime tier, and maps 9 features to their required minimum tier.
/// Includes a 7-day free trial that grants all features on first install.
/// `currentTier()` currently always returns `.free` — StoreKit 2 integration is TODO (Phase 11).
enum AccessControl {

    // Lifetime free — no IAP, no Apple cut, no expiry, no renewal risk
    private static let lifetimeFreeUserIds: Set<String> = [
        // ADD BETA USER ID HERE AFTER ACCOUNT CREATION
    ]

    private static let trialDurationDays = 7
    static let iso8601Formatter = ISO8601DateFormatter()

    /// Cached trial days remaining, refreshed at most once per minute. Thread-safe via lock.
    private static let trialCache = OSAllocatedUnfairLock<(value: Int, expiry: Date)?>(initialState: nil)

    /// Clears the trial cache so the next call to `trialDaysRemaining()` reads fresh Keychain data.
    /// Intended for test use only.
    static func invalidateTrialCache() {
        trialCache.withLock { $0 = nil }
    }

    // MARK: - Access Checks

    /// Returns whether a user's subscription tier grants access to a feature.
    /// Lifetime free users and active trial users bypass all tier checks.
    static func hasAccess(userId: String, feature: Feature) -> Bool {
        if lifetimeFreeUserIds.contains(userId) { return true }
        if isTrialActive() { return true }
        return feature.requiredTier <= currentTier(userId: userId)
    }

    static func currentTier(userId: String) -> SubscriptionTier {
        if lifetimeFreeUserIds.contains(userId) { return .lifetime }
        // TODO: Phase 11 — query StoreKit 2 for active subscription
        return .free
    }

    // MARK: - Trial

    /// Returns true if the user is within their 7-day free trial period.
    /// Trial status is cached for 60 seconds to avoid repeated Keychain reads.
    static func isTrialActive() -> Bool {
        trialDaysRemaining() > 0
    }

    /// Returns the number of trial days remaining (0 if expired or no trial date found).
    /// Cached for 60 seconds to avoid repeated Keychain I/O and date parsing.
    static func trialDaysRemaining() -> Int {
        trialCache.withLock { cached in
            if let cached, cached.expiry > Date() {
                return cached.value
            }
            guard let dateString = KeychainHelper.read(key: KeychainKey.trialStartDate),
                  let startDate = iso8601Formatter.date(from: dateString) else {
                cached = (0, Date().addingTimeInterval(60))
                return 0
            }
            let elapsed = Calendar.current.dateComponents([.day], from: startDate, to: Date()).day ?? 0
            let remaining = max(0, trialDurationDays - elapsed)
            cached = (remaining, Date().addingTimeInterval(60))
            return remaining
        }
    }

    // MARK: - Feature

    enum Feature: String, Identifiable {
        var id: String { rawValue }
        case cameraCapture
        case psaImport
        case directEbayPublish
        case conditionGuide
        case rawCardAIIdentification
        case speedMode
        case batchMode
        case templates
        case pricingSuggestion
        case analyticsExport
        case multiStore

        var requiredTier: SubscriptionTier {
            switch self {
            case .cameraCapture:
                return .free
            case .psaImport, .directEbayPublish, .conditionGuide:
                return .starter
            case .rawCardAIIdentification, .speedMode, .batchMode, .templates:
                return .seller
            case .pricingSuggestion:
                return .pro
            case .analyticsExport, .multiStore:
                return .power
            }
        }

        var displayName: String {
            switch self {
            case .cameraCapture: return "Camera Scanning"
            case .psaImport: return "PSA Scan Import"
            case .directEbayPublish: return "eBay Publishing"
            case .conditionGuide: return "Condition Guide"
            case .rawCardAIIdentification: return "AI Card Identification"
            case .speedMode: return "Speed Mode"
            case .batchMode: return "Batch Import"
            case .templates: return "Listing Templates"
            case .pricingSuggestion: return "Pricing Suggestions"
            case .analyticsExport: return "Analytics Export"
            case .multiStore: return "Multi-Store Listing"
            }
        }
    }

    // MARK: - Subscription Tier

    enum SubscriptionTier: Int, Comparable {
        case free     = 0
        case starter  = 1
        case seller   = 2
        case pro      = 3
        case power    = 4
        case lifetime = 999

        static func < (lhs: SubscriptionTier, rhs: SubscriptionTier) -> Bool {
            lhs.rawValue < rhs.rawValue
        }

        var displayName: String {
            switch self {
            case .free: return "Free"
            case .starter: return "Starter"
            case .seller: return "Seller"
            case .pro: return "Pro"
            case .power: return "Power"
            case .lifetime: return "Lifetime"
            }
        }
    }
}
