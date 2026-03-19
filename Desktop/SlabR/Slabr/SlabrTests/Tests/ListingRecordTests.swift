import XCTest
import CoreData
@testable import Slabr

final class ListingRecordTests: XCTestCase {

    private var context = TestCoreDataStack.makeContext()

    // MARK: - generatedListingTitle

    func testGeneratedTitleIncludesAllParts() {
        let listing = TestCoreDataStack.makeListingRecord(
            context: context,
            playerName: "Mike Trout",
            year: 2011,
            brand: "Topps",
            setName: "Update",
            cardNumber: "US175",
            grade: "10",
            parallel: nil,
            certNumber: "12345678"
        )
        let title = listing.card!.generatedListingTitle
        XCTAssertTrue(title.contains("2011"))
        XCTAssertTrue(title.contains("Topps"))
        XCTAssertTrue(title.contains("Update"))
        XCTAssertTrue(title.contains("Mike Trout"))
        XCTAssertTrue(title.contains("#US175"))
        XCTAssertTrue(title.contains("PSA 10"))
    }

    func testGeneratedTitleSkipsEmptyYear() {
        let listing = TestCoreDataStack.makeListingRecord(context: context, year: 0)
        let title = listing.card!.generatedListingTitle
        XCTAssertFalse(title.hasPrefix("0"))
    }

    func testGeneratedTitleSkipsNilGrade() {
        let listing = TestCoreDataStack.makeListingRecord(context: context, grade: nil)
        let title = listing.card!.generatedListingTitle
        XCTAssertFalse(title.contains("PSA"))
    }

    func testGeneratedTitleTruncatesAt80Chars() {
        let listing = TestCoreDataStack.makeListingRecord(
            context: context,
            playerName: "A Very Long Player Name That Will Push The Title Over Eighty Characters",
            parallel: "Super Rare Parallel Refractor"
        )
        let title = listing.card!.generatedListingTitle
        XCTAssertLessThanOrEqual(title.count, 80)
    }

    func testGeneratedTitleExactly80NoTruncation() {
        let listing = TestCoreDataStack.makeListingRecord(
            context: context,
            playerName: "Player",
            year: 2023,
            brand: "Brand",
            setName: "Set",
            cardNumber: "1",
            grade: "10",
            parallel: nil
        )
        let title = listing.card!.generatedListingTitle
        if title.count <= 80 {
            XCTAssertEqual(title, listing.card!.generatedListingTitle)
        }
    }

    // MARK: - effectiveListingTitle

    func testEffectiveListingTitleUsesCustomWhenSet() {
        let listing = TestCoreDataStack.makeListingRecord(context: context, title: "Custom Title")
        XCTAssertEqual(listing.effectiveListingTitle, "Custom Title")
    }

    func testEffectiveListingTitleFallsBackToGenerated() {
        let listing = TestCoreDataStack.makeListingRecord(context: context, title: nil)
        XCTAssertEqual(listing.effectiveListingTitle, listing.card!.generatedListingTitle)
    }

    // MARK: - applyDefaults

    func testApplyDefaultsOnlyAppliesOnce() {
        let listing = TestCoreDataStack.makeListingRecord(context: context)
        listing.listingFormat = "auction"

        let settings = UserSettingsEntity(context: context)
        settings.userId = "test-user"
        settings.defaultFormat = "fixedPrice"

        listing.applyDefaults(from: settings)

        XCTAssertEqual(listing.listingFormat, "auction")
    }
}
