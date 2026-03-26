import XCTest
import CoreData
@testable import Slabr

final class ListingRecordFactoryTests: XCTestCase {

    private var context: NSManagedObjectContext!

    override func setUp() {
        super.setUp()
        context = TestCoreDataStack.makeContext()
    }

    private func makeSampleCard() -> PSACard {
        PSACard(
            certNumber: "12345678",
            playerName: "Shohei Ohtani",
            year: "2023",
            brand: "Topps",
            setName: "Chrome",
            cardNumber: "150",
            parallel: "Prizm Blue Refractor",
            grade: "10",
            gradeDescription: "GEM-MT 10",
            isRookie: false,
            population: 45
        )
    }

    // MARK: - createDraft (from PSACard)

    func testCreateDraftSetsAllCardFields() {
        let card = makeSampleCard()
        let listing = ListingRecordFactory.createDraft(
            from: card, entryPoint: "psa", userId: "user-1",
            thumbnailData: nil, in: context
        )

        let cardRecord = listing.card!
        XCTAssertEqual(cardRecord.certNumber, "12345678")
        XCTAssertEqual(cardRecord.playerName, "Shohei Ohtani")
        XCTAssertEqual(cardRecord.year, 2023)
        XCTAssertEqual(cardRecord.brand, "Topps")
        XCTAssertEqual(cardRecord.setName, "Chrome")
        XCTAssertEqual(cardRecord.cardNumber, "150")
        XCTAssertEqual(cardRecord.parallel, "Prizm Blue Refractor")
        XCTAssertEqual(cardRecord.grade, "10")
        XCTAssertEqual(cardRecord.isRookie, false)
        XCTAssertEqual(cardRecord.psaPopulation, 45)
        XCTAssertEqual(cardRecord.confidenceScore, 100)
    }

    func testCreateDraftSetsListingMetadata() {
        let card = makeSampleCard()
        let listing = ListingRecordFactory.createDraft(
            from: card, entryPoint: "psa", userId: "user-1",
            thumbnailData: nil, in: context
        )

        XCTAssertEqual(listing.userId, "user-1")
        XCTAssertEqual(listing.entryPoint, "psa")
        XCTAssertEqual(listing.status, RecordStatus.draft.rawValue)
        XCTAssertNotNil(listing.date)
        XCTAssertNotNil(listing.id)
    }

    func testCreateDraftCreatesMediaRecord() {
        let thumbnailData = Data([0xFF, 0xD8, 0xFF])
        let card = makeSampleCard()
        let listing = ListingRecordFactory.createDraft(
            from: card, entryPoint: "psa", userId: "user-1",
            thumbnailData: thumbnailData, in: context
        )

        XCTAssertNotNil(listing.media)
        XCTAssertEqual(listing.media?.thumbnailData, thumbnailData)
    }

    func testCreateDraftDoesNotSave() {
        let card = makeSampleCard()
        _ = ListingRecordFactory.createDraft(
            from: card, entryPoint: "psa", userId: "user-1",
            thumbnailData: nil, in: context
        )

        XCTAssertTrue(context.hasChanges)
    }

    // MARK: - createRawDraft

    func testCreateRawDraftSetsEntryMethod() {
        let listing = ListingRecordFactory.createRawDraft(
            userId: "user-2", thumbnailData: nil, in: context
        )

        XCTAssertEqual(listing.card?.entryMethod, "camera_raw")
    }

    func testCreateRawDraftSetsBlankCardFields() {
        let listing = ListingRecordFactory.createRawDraft(
            userId: "user-2", thumbnailData: nil, in: context
        )

        let cardRecord = listing.card!
        XCTAssertEqual(cardRecord.playerName, "")
        XCTAssertEqual(cardRecord.brand, "")
        XCTAssertEqual(cardRecord.setName, "")
        XCTAssertEqual(cardRecord.cardNumber, "")
        XCTAssertEqual(cardRecord.year, 0)
    }
}
