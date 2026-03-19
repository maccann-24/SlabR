import CoreData
@testable import Slabr

final class MockEbayService: EbayServiceProtocol {
    var publishResult: Result<String, Error> = .success("MOCK-ID")
    var canPublishResult = true

    func publishListing(listing: ListingRecord, context: NSManagedObjectContext) async throws -> String {
        try publishResult.get()
    }

    func canPublish(listing: ListingRecord) -> Bool {
        canPublishResult
    }
}
