import Foundation

enum SellerMode: String, CaseIterable {
    case casual
    case regular
    case highVolume

    var displayName: String {
        switch self {
        case .casual: return "Casual"
        case .regular: return "Regular"
        case .highVolume: return "High Volume"
        }
    }

    /// Migration: map legacy values to new cases
    init(legacyValue: String) {
        switch legacyValue {
        case "standard": self = .regular
        case "speed": self = .highVolume
        default: self = Self(rawValue: legacyValue) ?? .regular
        }
    }
}
