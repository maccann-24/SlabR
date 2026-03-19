import CoreData
@testable import Slabr

enum TestCoreDataStack {
    static func makeContext() -> NSManagedObjectContext {
        PersistenceController(inMemory: true).container.viewContext
    }

    static func makeListingRecord(
        context: NSManagedObjectContext,
        playerName: String = "Mike Trout",
        year: Int16 = 2011,
        brand: String = "Topps",
        setName: String = "Update",
        cardNumber: String = "US175",
        grade: String? = "10",
        parallel: String? = nil,
        certNumber: String? = "12345678",
        price: Decimal? = nil,
        title: String? = nil,
        status: String = RecordStatus.draft.rawValue,
        userId: String = "test-user",
        thumbnailData: Data? = nil
    ) -> ListingRecord {
        let card = CardRecord(context: context)
        card.id = UUID()
        card.playerName = playerName
        card.year = year
        card.brand = brand
        card.setName = setName
        card.cardNumber = cardNumber
        card.grade = grade
        card.parallel = parallel
        card.certNumber = certNumber
        card.psaPopulation = 0
        card.confidenceScore = 100
        card.isRookie = false

        let listing = ListingRecord(context: context)
        listing.id = UUID()
        listing.date = .now
        listing.userId = userId
        listing.entryPoint = "psa"
        listing.status = status
        listing.card = card
        if let price { listing.listingPrice = price as NSDecimalNumber }
        if let title { listing.listingTitle = title }

        let media = MediaRecord(context: context)
        media.id = UUID()
        media.thumbnailData = thumbnailData
        media.listing = listing

        return listing
    }
}
