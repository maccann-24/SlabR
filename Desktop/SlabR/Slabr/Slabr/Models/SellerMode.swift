import Foundation

enum SellerMode: String, CaseIterable {
    case standard
    case speed

    var displayName: String {
        switch self {
        case .standard: return "Standard"
        case .speed: return "Speed"
        }
    }
}
