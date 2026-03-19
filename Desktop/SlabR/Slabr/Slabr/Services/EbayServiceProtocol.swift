import Foundation

struct ListingPublishRequest {
    let title: String
    let price: Decimal
    let condition: String?
}

protocol EbayServiceProtocol {
    func publishListing(request: ListingPublishRequest) async throws -> String
    func canPublish(request: ListingPublishRequest) -> Bool
}

extension EbayService: EbayServiceProtocol {}
