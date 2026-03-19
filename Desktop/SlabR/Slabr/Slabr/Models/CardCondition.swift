import Foundation

/// eBay-standard card condition grades for raw (ungraded) cards.
/// Raw value matches eBay's condition terminology exactly.
/// Condition is always selected manually by the seller — AI never suggests condition.
enum CardCondition: String, CaseIterable, Identifiable {
    case gemMint = "Gem Mint"
    case nearMintMint = "Near Mint-Mint (NM-MT)"
    case nearMint = "Near Mint (NM)"
    case excellentMint = "Excellent-Mint (EX-MT)"
    case excellent = "Excellent (EX)"
    case veryGoodExcellent = "Very Good-Excellent (VG-EX)"
    case veryGood = "Very Good (VG)"
    case good = "Good (G)"
    case poor = "Poor (P)"

    var id: String { rawValue }

    /// Short display name for chip labels.
    var shortName: String {
        switch self {
        case .gemMint: return "Gem Mint"
        case .nearMintMint: return "NM-MT"
        case .nearMint: return "NM"
        case .excellentMint: return "EX-MT"
        case .excellent: return "EX"
        case .veryGoodExcellent: return "VG-EX"
        case .veryGood: return "VG"
        case .good: return "Good"
        case .poor: return "Poor"
        }
    }
}
