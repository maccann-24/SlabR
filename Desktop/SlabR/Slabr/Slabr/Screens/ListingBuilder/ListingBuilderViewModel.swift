import SwiftUI
import CoreData

@MainActor
final class ListingBuilderViewModel: ObservableObject {

    enum BuilderState: Equatable {
        case editing
        case publishing
        case published(listingId: String)
        case error(String)
    }

    @Published var title: String = ""
    @Published var priceText: String = ""
    @Published var priceError: String?
    @Published var format: ListingFormat = .fixedPrice
    @Published var acceptBestOffer: Bool = false
    @Published var minimumOfferText: String = ""
    @Published var auctionDurationDays: Int = 7
    @Published var state: BuilderState = .editing

    // Read-only card fields
    let playerName: String
    let year: String
    let brand: String
    let setName: String
    let cardNumber: String
    let parallel: String?
    let grade: String?
    let certNumber: String?
    let isRookie: Bool
    @Published private(set) var thumbnailImage: UIImage?
    @Published var condition: CardCondition?

    private let listing: ListingRecord
    private let ebayService: EbayServiceProtocol
    private var context: NSManagedObjectContext {
        guard let ctx = listing.managedObjectContext else {
            Log.builder.fault("ListingRecord has no managedObjectContext")
            return PersistenceController.shared.container.viewContext
        }
        return ctx
    }
    var recordUserId: String { listing.userId ?? "" }

    /// True if this is a raw (ungraded) card — shows condition selector, hides PSA fields.
    var isRawCard: Bool {
        let hasGrade = !(listing.card?.grade ?? "").isEmpty
        return !hasGrade && listing.card?.entryMethod == "camera_raw"
    }

    private static let maxPrice = Decimal(string: "99999.99")!

    var canPublish: Bool {
        let baseValid = validatePrice() == nil && !title.isEmpty && title.count <= 80
        if isRawCard { return baseValid && condition != nil }
        return baseValid
    }

    /// Validates `priceText` against business rules: must be non-empty, numeric,
    /// greater than $0.00, at most $99,999.99, and have at most 2 decimal places.
    /// Returns a user-facing error message, or `nil` if valid.
    func validatePrice() -> String? {
        guard !priceText.isEmpty else { return "Enter a price." }
        guard let price = Decimal(string: priceText) else { return "Enter a valid number." }
        guard price > 0 else { return "Price must be greater than $0.00." }
        guard price <= Self.maxPrice else { return "Price cannot exceed $99,999.99." }
        if let dotIndex = priceText.firstIndex(of: ".") {
            let decimals = priceText[priceText.index(after: dotIndex)...].count
            if decimals > 2 { return "Price can have at most 2 decimal places." }
        }
        return nil
    }

    func updatePriceValidation() {
        priceError = validatePrice()
    }

    func loadThumbnail() {
        guard let data = listing.media?.thumbnailData else { return }
        Task.detached(priority: .utility) { [weak self] in
            let image = UIImage(data: data)
            await MainActor.run {
                self?.thumbnailImage = image
            }
        }
    }

    init(listing: ListingRecord, ebayService: EbayServiceProtocol = EbayService.shared) {
        self.listing = listing
        self.ebayService = ebayService

        // Read card fields from related CardRecord
        self.playerName = listing.card?.playerName ?? ""
        self.year = { guard let y = listing.card?.year, y > 0 else { return "" }; return "\(y)" }()
        self.brand = listing.card?.brand ?? ""
        self.setName = listing.card?.setName ?? ""
        self.cardNumber = listing.card?.cardNumber ?? ""
        self.parallel = listing.card?.parallel
        self.grade = listing.card?.grade
        self.certNumber = listing.card?.certNumber
        self.isRookie = listing.card?.isRookie ?? false
        self.thumbnailImage = nil

        // Set title
        self.title = listing.effectiveListingTitle

        // Populate price if previously set
        if let price = listing.listingPrice as Decimal?, price > 0 {
            self.priceText = "\(price)"
        }

        // Populate format if previously set, otherwise load defaults
        if let fmt = listing.listingFormat, let listingFmt = ListingFormat(rawValue: fmt) {
            self.format = listingFmt
            self.acceptBestOffer = listing.acceptBestOffer
            if let minOffer = listing.minimumOfferAmount as Decimal?, minOffer > 0 {
                self.minimumOfferText = "\(minOffer)"
            }
            self.auctionDurationDays = Int(listing.auctionDurationDays)
        } else {
            loadDefaults()
        }
    }

    func loadDefaults() {
        let request = NSFetchRequest<UserSettingsEntity>(entityName: "UserSettingsEntity")
        let userId = listing.userId ?? ""
        request.predicate = NSPredicate(format: "userId == %@", userId)
        request.fetchLimit = 1

        do {
            if let settings = try context.fetch(request).first {
                listing.applyDefaults(from: settings)

                format = ListingFormat(rawValue: listing.listingFormat ?? ListingFormat.fixedPrice.rawValue) ?? .fixedPrice
                acceptBestOffer = listing.acceptBestOffer
                if let minOffer = listing.minimumOfferAmount as Decimal?, minOffer > 0 {
                    minimumOfferText = "\(minOffer)"
                }
                auctionDurationDays = Int(listing.auctionDurationDays)
            }
        } catch {
            Log.builder.error("Failed to load user defaults: \(error)")
        }
    }

    func publish() {
        state = .publishing
        writeFormToListing()

        let request = ListingPublishRequest(
            title: listing.effectiveListingTitle,
            price: listing.listingPrice as? Decimal ?? 0,
            condition: listing.card?.condition
        )

        Task {
            do {
                let listingId = try await ebayService.publishListing(request: request)

                listing.listingId = listingId
                listing.status = RecordStatus.listed.rawValue
                listing.listedDate = .now
                try context.save()

                HapticManager.shared.listingPublished()
                state = .published(listingId: listingId)
            } catch {
                HapticManager.shared.postFailed()
                state = .error(error.localizedDescription)
            }
        }
    }

    func saveDraft() {
        writeFormToListing()
        do {
            try context.save()
        } catch {
            Log.builder.error("Save draft failed: \(error)")
        }
    }

    private func writeFormToListing() {
        listing.listingTitle = title
        listing.listingFormat = format.rawValue
        listing.acceptBestOffer = acceptBestOffer
        listing.auctionDurationDays = Int16(auctionDurationDays)

        if let price = Decimal(string: priceText), validatePrice() == nil {
            listing.listingPrice = price as NSDecimalNumber
        }

        if let minOffer = Decimal(string: minimumOfferText), minOffer > 0 {
            listing.minimumOfferAmount = minOffer as NSDecimalNumber
        } else {
            listing.minimumOfferAmount = nil
        }

        // Save condition for raw cards
        listing.card?.condition = condition?.rawValue
    }
}
