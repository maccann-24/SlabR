@testable import Slabr

final class MockEbayService: EbayServiceProtocol {
    var publishResult: Result<String, Error> = .success("MOCK-ID")
    var canPublishResult = true
    var lastPublishRequest: ListingPublishRequest?

    func publishListing(request: ListingPublishRequest) async throws -> String {
        lastPublishRequest = request
        return try publishResult.get()
    }

    func canPublish(request: ListingPublishRequest) -> Bool {
        canPublishResult
    }
}
