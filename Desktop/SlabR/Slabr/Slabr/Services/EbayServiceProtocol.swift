import Foundation

struct ListingPublishRequest {
    let title: String
    let price: Decimal
    let condition: String?

    // Full-res image for eBay upload
    var imageData: Data? = nil

    // eBay category — 261328 = Sports Trading Cards
    var categoryId: String = "261328"

    // Listing description (HTML or plain text)
    var description: String? = nil

    // Card metadata for eBay item aspects
    var playerName: String? = nil
    var year: String? = nil
    var brand: String? = nil
    var grade: String? = nil
    var cardNumber: String? = nil

    // "FIXED_PRICE" or "AUCTION"
    var format: String = "FIXED_PRICE"
}

protocol EbayServiceProtocol {
    func publishListing(request: ListingPublishRequest) async throws -> String
    func canPublish(request: ListingPublishRequest) -> Bool
}

extension EbayService: EbayServiceProtocol {}
