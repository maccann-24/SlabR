import XCTest
@testable import Slabr

final class SlabrTests: XCTestCase {

    func testPersistenceControllerInitializes() throws {
        let controller = PersistenceController(inMemory: true)
        XCTAssertNotNil(controller.container.viewContext)
    }

    func testRecordStatusEnumRawValues() {
        XCTAssertEqual(RecordStatus.draft.rawValue, "draft")
        XCTAssertEqual(RecordStatus.listed.rawValue, "listed")
    }

    func testListingFormatCases() {
        XCTAssertEqual(ListingFormat.fixedPrice.rawValue, "fixedPrice")
        XCTAssertEqual(ListingFormat.auction.rawValue, "auction")
        XCTAssertEqual(ListingFormat.buyItNow.rawValue, "buyItNow")
    }

    func testListingFormatDisplayNames() {
        XCTAssertEqual(ListingFormat.fixedPrice.displayName, "Fixed Price")
        XCTAssertEqual(ListingFormat.auction.displayName, "Auction")
        XCTAssertEqual(ListingFormat.buyItNow.displayName, "Buy It Now")
    }
}
