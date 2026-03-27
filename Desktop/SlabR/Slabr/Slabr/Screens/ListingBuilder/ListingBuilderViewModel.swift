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
    @Published var minimumOfferError: String?
    @Published var format: ListingFormat = .fixedPrice
    @Published var acceptBestOffer: Bool = false
    @Published var minimumOfferText: String = ""
    @Published var auctionDurationDays: Int = 7
    @Published var state: BuilderState = .editing

    // Category
    @Published var category: EbayCategory?
    @Published var suggestedCategory: EbayCategory?

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

    private var publishTask: Task<Void, Never>?

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

    // MARK: - Access Control

    func showConditionGuideButton(userId: String) -> Bool {
        AccessControl.hasAccess(userId: userId, feature: .conditionGuide)
    }

    func canPublishToEbay(userId: String) -> Bool {
        AccessControl.hasAccess(userId: userId, feature: .directEbayPublish)
    }

    /// True if this is a raw (ungraded) card — shows condition selector, hides PSA fields.
    var isRawCard: Bool {
        let hasGrade = !(listing.card?.grade ?? "").isEmpty
        return !hasGrade && listing.card?.entryMethod == "camera_raw"
    }

    private static let maxPrice = Decimal(string: "99999.99")!

    var canPublish: Bool {
        let baseValid = validatePrice() == nil && validateMinimumOffer() == nil && !title.isEmpty && title.count <= 80
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

    /// Validates `minimumOfferText` against business rules: optional field, but if present
    /// must be numeric, greater than $0.00, at most $99,999.99, at most 2 decimal places,
    /// and less than the listing price. Returns a user-facing error message, or `nil` if valid.
    func validateMinimumOffer() -> String? {
        guard !minimumOfferText.isEmpty else { return nil }  // Optional field
        guard let offer = Decimal(string: minimumOfferText) else { return "Enter a valid number." }
        guard offer > 0 else { return "Minimum offer must be greater than $0.00." }
        guard offer <= Self.maxPrice else { return "Offer cannot exceed $99,999.99." }
        let decimalParts = minimumOfferText.split(separator: ".")
        if decimalParts.count == 2, decimalParts[1].count > 2 { return "Offer can have at most 2 decimal places." }
        if let price = Decimal(string: priceText), price > 0, offer >= price {
            return "Minimum offer must be less than the listing price."
        }
        return nil
    }

    func updatePriceValidation() {
        priceError = validatePrice()
        minimumOfferError = validateMinimumOffer()
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

    /// Auto-detects the best eBay category from card metadata using the Taxonomy API.
    /// Sets `suggestedCategory` on success; falls back to the default sports trading cards category.
    func loadCategory() {
        guard suggestedCategory == nil else { return }
        let query = EbayCategoryService.suggestFromCard(
            playerName: playerName.isEmpty ? nil : playerName,
            brand: brand.isEmpty ? nil : brand
        )

        Task {
            do {
                let suggestions = try await EbayCategoryService.suggestCategory(for: query)
                if let best = suggestions.first {
                    suggestedCategory = best
                    // Only set category if user hasn't manually chosen one
                    if category == nil {
                        category = best
                    }
                }
            } catch {
                Log.builder.error("Category detection failed: \(error.localizedDescription, privacy: .public)")
                suggestedCategory = EbayCategoryService.defaultCategory
                if category == nil {
                    category = EbayCategoryService.defaultCategory
                }
            }
        }
    }

    init(
        listing: ListingRecord,
        ebayService: EbayServiceProtocol = RealEbayService.shared
    ) {
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
        publishTask?.cancel()
        state = .publishing
        writeFormToListing()

        let ebayFormat: String = {
            switch format {
            case .auction: return "AUCTION"
            case .fixedPrice, .buyItNow: return "FIXED_PRICE"
            }
        }()

        var request = ListingPublishRequest(
            title: listing.effectiveListingTitle,
            price: listing.listingPrice as? Decimal ?? 0,
            condition: listing.card?.condition
        )
        request.imageData = listing.media?.imageData
        request.description = generateDescription()
        request.playerName = playerName.isEmpty ? nil : playerName
        request.year = year.isEmpty ? nil : year
        request.brand = brand.isEmpty ? nil : brand
        request.grade = grade
        request.cardNumber = cardNumber.isEmpty ? nil : cardNumber
        request.format = ebayFormat
        request.categoryId = category?.id ?? EbayCategoryService.defaultCategory.id

        publishTask = Task {
            guard !Task.isCancelled else { return }
            do {
                let listingId = try await ebayService.publishListing(request: request)
                guard !Task.isCancelled else { return }

                listing.listingId = listingId
                listing.status = RecordStatus.listed.rawValue
                listing.listedDate = .now
                try context.save()

                HapticManager.shared.listingPublished()
                state = .published(listingId: listingId)
            } catch {
                guard !Task.isCancelled else { return }
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

    /// Builds a listing description from card metadata.
    /// Returns a plain-text description suitable for eBay's `listingDescription` field.
    private func generateDescription() -> String {
        var lines: [String] = []

        // Title line
        lines.append(listing.effectiveListingTitle)
        lines.append("")

        // Card details
        if !playerName.isEmpty { lines.append("Player: \(playerName)") }
        if !year.isEmpty { lines.append("Year: \(year)") }
        if !brand.isEmpty { lines.append("Brand: \(brand)") }
        if !setName.isEmpty { lines.append("Set: \(setName)") }
        if !cardNumber.isEmpty { lines.append("Card #: \(cardNumber)") }

        if let parallel, !parallel.isEmpty {
            lines.append("Parallel: \(parallel)")
        }

        // Grading / condition
        if let grade, !grade.isEmpty {
            lines.append("Grade: PSA \(grade)")
        }
        if let certNumber, !certNumber.isEmpty {
            lines.append("PSA Cert #: \(certNumber)")
        }
        if let condition {
            lines.append("Condition: \(condition.rawValue)")
        }

        if isRookie {
            lines.append("Rookie Card")
        }

        lines.append("")
        lines.append("Listed with Slabr")

        return lines.joined(separator: "\n")
    }
}
