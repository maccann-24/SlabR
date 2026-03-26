@testable import Slabr

final class MockEbayService: EbayServiceProtocol {
    var publishResult: Result<String, Error> = .success("MOCK-ID")
    var canPublishResult = true
    var publishCallCount = 0
    var lastPublishRequest: ListingPublishRequest?

    func publishListing(request: ListingPublishRequest) async throws -> String {
        publishCallCount += 1
        lastPublishRequest = request
        return try publishResult.get()
    }

    func canPublish(request: ListingPublishRequest) -> Bool {
        canPublishResult
    }
}
