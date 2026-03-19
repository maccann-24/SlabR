import Foundation

enum ListingFormat: String, CaseIterable, Identifiable {
    case fixedPrice
    case auction
    case buyItNow

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .fixedPrice: return "Fixed Price"
        case .auction: return "Auction"
        case .buyItNow: return "Buy It Now"
        }
    }
}