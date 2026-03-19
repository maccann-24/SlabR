import XCTest
import CoreData
@testable import Slabr

final class EbayServiceTests: XCTestCase {

    private var context = TestCoreDataStack.makeContext()

    func testPublishRejectsMissingPrice() async {
        let record = TestCoreDataStack.makeListingRecord(context: context, price: nil)
        do {
            _ = try await EbayService.shared.publishListing(listing: record, context: context)
            XCTFail("Expected missingPrice error")
        } catch let error as EbayService.EbayServiceError {
            XCTAssertEqual(error.errorDescription, "A listing price is required.")
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }

    func testPublishRejectsTitleOver80Chars() async {
        let longTitle = String(repeating: "A", count: 81)
        let record = TestCoreDataStack.makeListingRecord(context: context, price: 9.99, title: longTitle)
        do {
            _ = try await EbayService.shared.publishListing(listing: record, context: context)
            XCTFail("Expected titleTooLong error")
        } catch let error as EbayService.EbayServiceError {
            XCTAssertEqual(error.errorDescription, "Title must be 80 characters or fewer.")
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }

    func testPublishSetsListedStatusAndDate() async throws {
        let record = TestCoreDataStack.makeListingRecord(context: context, price: 29.99)
        let listingId = try await EbayService.shared.publishListing(listing: record, context: context)
        XCTAssertFalse(listingId.isEmpty)
        XCTAssertEqual(record.status, RecordStatus.listed.rawValue)
        XCTAssertNotNil(record.listedDate)
    }

    func testCanPublishRejectsZeroPrice() {
        let record = TestCoreDataStack.makeListingRecord(context: context, price: 0)
        XCTAssertFalse(EbayService.shared.canPublish(listing: record))
    }
}
