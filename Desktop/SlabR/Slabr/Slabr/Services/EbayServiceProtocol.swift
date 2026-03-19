import CoreData

protocol EbayServiceProtocol {
    func publishListing(listing: ListingRecord, context: NSManagedObjectContext) async throws -> String
    func canPublish(listing: ListingRecord) -> Bool
}

extension EbayService: EbayServiceProtocol {}
