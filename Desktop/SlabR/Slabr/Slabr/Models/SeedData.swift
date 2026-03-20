import CoreData

/// Seeds the Core Data store with realistic mock data for UI/UX testing.
/// Call `SeedData.populate(context:userId:)` once — it checks for existing data first.
enum SeedData {

    static func populate(context: NSManagedObjectContext, userId: String) {
        // Guard: don't double-seed
        let check = NSFetchRequest<ListingRecord>(entityName: "ListingRecord")
        check.predicate = NSPredicate(format: "userId == %@", userId)
        check.fetchLimit = 1
        guard (try? context.count(for: check)) == 0 else { return }

        // -- PSA Graded Cards (listed) --
        let listed: [(String, String, String, String, String, String?, String, Bool, Int32, Decimal, Int)] = [
            ("Shohei Ohtani",    "2023", "Topps",     "Chrome",       "150",  "Refractor",      "10", false, 45,  349.99, -3),
            ("Victor Wembanyama","2023", "Panini",    "Prizm",        "280",  nil,               "10", true,  12,  899.99, -5),
            ("Luka Doncic",     "2019", "Panini",    "Prizm",        "75",   "Silver",          "10", false, 89,  475.00, -7),
            ("Mike Trout",      "2011", "Topps",     "Update",       "US175", nil,              "10", true,  320, 1250.00, -14),
            ("Patrick Mahomes", "2017", "Panini",    "Prizm",        "269",  nil,               "9",  true,  410, 285.00, -2),
            ("Jayson Tatum",    "2017", "Panini",    "Prizm",        "16",   "Red White Blue",  "10", true,  67,  195.00, -20),
            ("Juan Soto",       "2018", "Topps",     "Chrome",       "BC-40", nil,              "10", false, 890, 145.00, -10),
            ("Ja Morant",       "2019", "Panini",    "Prizm",        "249",  nil,               "10", true,  156, 210.00, -12),
        ]

        for (i, card) in listed.enumerated() {
            let c = CardRecord(context: context)
            c.id = UUID()
            c.playerName = card.0
            c.year = Int16(card.1) ?? 0
            c.brand = card.2
            c.setName = card.3
            c.cardNumber = card.4
            c.parallel = card.5
            c.grade = card.6
            c.isRookie = card.7
            c.psaPopulation = card.8
            c.confidenceScore = 100
            c.certNumber = String(format: "%08d", 10000000 + i)
            c.entryMethod = "camera_psa"

            let l = ListingRecord(context: context)
            l.id = UUID()
            l.date = Calendar.current.date(byAdding: .day, value: card.10, to: Date()) ?? Date()
            l.userId = userId
            l.entryPoint = "camera"
            l.status = RecordStatus.listed.rawValue
            l.listingPrice = card.9 as NSDecimalNumber
            l.listingFormat = "fixedPrice"
            l.listingId = "SLABR-\(UUID().uuidString.prefix(8))"
            l.listedDate = l.date
            l.card = c

            let m = MediaRecord(context: context)
            m.id = UUID()
            m.listing = l
        }

        // -- PSA Graded Cards (drafts) --
        let drafts: [(String, String, String, String, String, String?, String, Bool, Int32, Int)] = [
            ("Anthony Edwards", "2020", "Panini",  "Prizm",   "258",  "Green",  "10", true,  34, -1),
            ("Chet Holmgren",   "2022", "Panini",  "Prizm",   "212",  nil,      "9",  true,  78, -1),
            ("Bryce Harper",    "2019", "Topps",   "Chrome",  "100",  nil,      "10", false, 412, 0),
            ("Zion Williamson", "2019", "Panini",  "Prizm",   "248",  "Silver", "9",  true,  203, -4),
            ("Bo Jackson",      "1986", "Topps",   "Traded",  "50T",  nil,      "9",  false, 1200, -8),
        ]

        for (i, card) in drafts.enumerated() {
            let c = CardRecord(context: context)
            c.id = UUID()
            c.playerName = card.0
            c.year = Int16(card.1) ?? 0
            c.brand = card.2
            c.setName = card.3
            c.cardNumber = card.4
            c.parallel = card.5
            c.grade = card.6
            c.isRookie = card.7
            c.psaPopulation = card.8
            c.confidenceScore = 100
            c.certNumber = String(format: "%08d", 20000000 + i)
            c.entryMethod = "camera_psa"

            let l = ListingRecord(context: context)
            l.id = UUID()
            l.date = Calendar.current.date(byAdding: .day, value: card.9, to: Date()) ?? Date()
            l.userId = userId
            l.entryPoint = "camera"
            l.status = RecordStatus.draft.rawValue
            l.card = c

            let m = MediaRecord(context: context)
            m.id = UUID()
            m.listing = l
        }

        // -- Raw Cards (drafts, no grade) --
        let rawDrafts: [(String, String, String, String, String, String?, Int)] = [
            ("Derek Jeter",     "1993", "SP",       "Foil",     "279",  "Near Mint (NM)",        0),
            ("Ken Griffey Jr.", "1989", "Upper Deck","Series 1", "1",    "Excellent-Mint (EX-MT)", -2),
            ("Aaron Judge",     "2017", "Topps",    "Chrome",   "169",  nil,                      -1),
        ]

        for card in rawDrafts {
            let c = CardRecord(context: context)
            c.id = UUID()
            c.playerName = card.0
            c.year = Int16(card.1) ?? 0
            c.brand = card.2
            c.setName = card.3
            c.cardNumber = card.4
            c.condition = card.5
            c.entryMethod = "camera_raw"

            let l = ListingRecord(context: context)
            l.id = UUID()
            l.date = Calendar.current.date(byAdding: .day, value: card.6, to: Date()) ?? Date()
            l.userId = userId
            l.entryPoint = "camera"
            l.status = RecordStatus.draft.rawValue
            l.card = c

            let m = MediaRecord(context: context)
            m.id = UUID()
            m.listing = l
        }

        // -- PSA Import Cards (listed, via photo import) --
        let imported: [(String, String, String, String, String, String, Bool, Decimal, Int)] = [
            ("Trevor Lawrence", "2021", "Panini", "Prizm",  "331", "10", true,  185.00, -30),
            ("Mookie Betts",    "2014", "Topps",  "Chrome", "MB-50", "9", false, 125.00, -25),
        ]

        for (i, card) in imported.enumerated() {
            let c = CardRecord(context: context)
            c.id = UUID()
            c.playerName = card.0
            c.year = Int16(card.1) ?? 0
            c.brand = card.2
            c.setName = card.3
            c.cardNumber = card.4
            c.grade = card.5
            c.isRookie = card.6
            c.confidenceScore = 100
            c.certNumber = String(format: "%08d", 30000000 + i)
            c.entryMethod = "photo_import"

            let l = ListingRecord(context: context)
            l.id = UUID()
            l.date = Calendar.current.date(byAdding: .day, value: card.8, to: Date()) ?? Date()
            l.userId = userId
            l.entryPoint = "psa"
            l.status = RecordStatus.listed.rawValue
            l.listingPrice = card.7 as NSDecimalNumber
            l.listingFormat = "fixedPrice"
            l.listingId = "SLABR-\(UUID().uuidString.prefix(8))"
            l.listedDate = l.date
            l.card = c

            let m = MediaRecord(context: context)
            m.id = UUID()
            m.listing = l
        }

        // -- Shipping Profile --
        let ship = ShippingProfileEntity(context: context)
        ship.id = UUID()
        ship.userId = userId
        ship.name = "Standard Shipping"
        ship.service = "USPS First Class"
        ship.handlingDays = 1
        ship.buyerPays = true
        ship.isDefault = true

        // -- User Settings --
        let settings = UserSettingsEntity(context: context)
        settings.userId = userId
        settings.sellerMode = SellerMode.regular.rawValue
        settings.defaultFormat = "fixedPrice"
        settings.returnsAccepted = true
        settings.returnPeriodDays = 30
        settings.conditionGuideEnabled = true

        do {
            try context.save()
            Log.coreData.info("Seed data populated: 18 listings (10 listed, 8 drafts)")
        } catch {
            Log.coreData.error("Seed data failed: \(error)")
        }
    }

    /// Removes all seed data for a userId. Used for resetting during development.
    static func clear(context: NSManagedObjectContext, userId: String) {
        let entities = ["ListingRecord", "CardRecord", "MediaRecord", "ShippingProfileEntity", "UserSettingsEntity"]
        for entity in entities {
            let request = NSFetchRequest<NSFetchRequestResult>(entityName: entity)
            request.predicate = NSPredicate(format: "userId == %@", userId)
            let delete = NSBatchDeleteRequest(fetchRequest: request)
            do {
                try context.execute(delete)
            } catch {
                Log.coreData.error("Seed clear failed for \(entity): \(error)")
            }
        }
        context.reset()
    }
}
