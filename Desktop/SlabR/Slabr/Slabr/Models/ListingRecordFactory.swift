import CoreData

/// Shared factory for creating CardRecord + ListingRecord + MediaRecord from a PSACard.
/// Used by both PSAImportViewModel and CameraViewModel to avoid duplicated entity creation logic.
enum ListingRecordFactory {
    /// Creates a linked CardRecord + ListingRecord + MediaRecord from PSA card data.
    /// Does NOT call `context.save()` — caller is responsible for saving.
    static func createDraft(
        from card: PSACard,
        entryPoint: String,
        userId: String,
        thumbnailData: Data?,
        in context: NSManagedObjectContext
    ) -> ListingRecord {
        let cardRecord = CardRecord(context: context)
        cardRecord.id = UUID()
        cardRecord.certNumber = card.certNumber
        cardRecord.playerName = card.playerName
        cardRecord.year = Int16(card.year) ?? 0
        cardRecord.brand = card.brand
        cardRecord.setName = card.setName
        cardRecord.cardNumber = card.cardNumber
        cardRecord.parallel = card.parallel
        cardRecord.grade = card.grade
        cardRecord.isRookie = card.isRookie
        cardRecord.psaPopulation = Int32(card.population ?? 0)
        cardRecord.confidenceScore = 100

        let listing = ListingRecord(context: context)
        listing.id = UUID()
        listing.date = Date.now
        listing.userId = userId
        listing.entryPoint = entryPoint
        listing.status = RecordStatus.draft.rawValue
        listing.card = cardRecord

        let media = MediaRecord(context: context)
        media.id = UUID()
        media.thumbnailData = thumbnailData
        media.listing = listing

        return listing
    }

    /// Creates a draft for a raw (ungraded) card with blank metadata fields.
    /// The user fills in card details manually in the ListingBuilder.
    /// Does NOT call `context.save()` — caller is responsible for saving.
    static func createRawDraft(
        userId: String,
        thumbnailData: Data?,
        in context: NSManagedObjectContext
    ) -> ListingRecord {
        let cardRecord = CardRecord(context: context)
        cardRecord.id = UUID()
        cardRecord.playerName = ""
        cardRecord.brand = ""
        cardRecord.setName = ""
        cardRecord.cardNumber = ""
        cardRecord.year = 0
        cardRecord.entryMethod = "camera_raw"

        let listing = ListingRecord(context: context)
        listing.id = UUID()
        listing.date = Date.now
        listing.userId = userId
        listing.entryPoint = "camera"
        listing.status = RecordStatus.draft.rawValue
        listing.card = cardRecord

        let media = MediaRecord(context: context)
        media.id = UUID()
        media.thumbnailData = thumbnailData
        media.listing = listing

        return listing
    }
}
