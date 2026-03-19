import XCTest
import CoreData
@testable import Slabr

final class PersistenceControllerTests: XCTestCase {

    func testInMemoryInitialization() {
        let controller = PersistenceController(inMemory: true)
        XCTAssertNotNil(controller.container)
    }

    func testViewContextCanInsertAndSave() throws {
        let controller = PersistenceController(inMemory: true)
        let context = controller.container.viewContext

        let card = CardRecord(context: context)
        card.id = UUID()
        card.playerName = "Test Player"
        card.brand = "Test"
        card.setName = "Test"
        card.cardNumber = "1"
        card.year = 2023

        let listing = ListingRecord(context: context)
        listing.id = UUID()
        listing.date = .now
        listing.userId = "test"
        listing.entryPoint = "test"
        listing.status = RecordStatus.draft.rawValue
        listing.card = card

        let media = MediaRecord(context: context)
        media.id = UUID()
        media.listing = listing

        try context.save()

        let request = NSFetchRequest<ListingRecord>(entityName: "ListingRecord")
        let results = try context.fetch(request)
        XCTAssertEqual(results.count, 1)
        XCTAssertEqual(results.first?.card?.playerName, "Test Player")
    }
}
