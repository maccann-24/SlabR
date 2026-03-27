import StoreKit

/// Maps StoreKit product IDs to subscription tiers.
/// Product IDs must match App Store Connect configuration exactly.
enum SlabrProduct: String, CaseIterable, Sendable {
    // Monthly
    case starterMonthly  = "com.slabr.starter.monthly"
    case sellerMonthly   = "com.slabr.seller.monthly"
    case proMonthly      = "com.slabr.pro.monthly"
    case powerMonthly    = "com.slabr.power.monthly"

    // Annual (2 months free)
    case starterAnnual   = "com.slabr.starter.annual"
    case sellerAnnual    = "com.slabr.seller.annual"
    case proAnnual       = "com.slabr.pro.annual"
    case powerAnnual     = "com.slabr.power.annual"

    var tier: AccessControl.SubscriptionTier {
        switch self {
        case .starterMonthly, .starterAnnual: return .starter
        case .sellerMonthly, .sellerAnnual:   return .seller
        case .proMonthly, .proAnnual:         return .pro
        case .powerMonthly, .powerAnnual:     return .power
        }
    }

    static var allProductIds: [String] { allCases.map(\.rawValue) }
}
