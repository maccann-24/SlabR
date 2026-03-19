import XCTest
@testable import Slabr

final class EbayServiceTests: XCTestCase {

    func testPublishRejectsMissingPrice() async {
        let request = ListingPublishRequest(title: "Test Card", price: 0, condition: nil)
        do {
            _ = try await EbayService.shared.publishListing(request: request)
            XCTFail("Expected missingPrice error")
        } catch let error as EbayService.EbayServiceError {
            XCTAssertEqual(error.errorDescription, "A listing price is required.")
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }

    func testPublishRejectsTitleOver80Chars() async {
        let longTitle = String(repeating: "A", count: 81)
        let request = ListingPublishRequest(title: longTitle, price: 9.99, condition: nil)
        do {
            _ = try await EbayService.shared.publishListing(request: request)
            XCTFail("Expected titleTooLong error")
        } catch let error as EbayService.EbayServiceError {
            XCTAssertEqual(error.errorDescription, "Title must be 80 characters or fewer.")
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }

    func testPublishReturnsListingId() async throws {
        let request = ListingPublishRequest(title: "Test Card PSA 10", price: 29.99, condition: nil)
        let listingId = try await EbayService.shared.publishListing(request: request)
        XCTAssertFalse(listingId.isEmpty)
        XCTAssertTrue(listingId.hasPrefix("SLABR-"))
    }

    func testCanPublishRejectsZeroPrice() {
        let request = ListingPublishRequest(title: "Test", price: 0, condition: nil)
        XCTAssertFalse(EbayService.shared.canPublish(request: request))
    }
}
