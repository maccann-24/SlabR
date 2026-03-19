import CoreData

/// eBay listing service. **Currently a mock** — generates fake listing IDs and
/// saves status locally. Does not make real eBay API calls.
/// Conforms to `EbayServiceProtocol` for testability via mock injection.
final class EbayService {
    static let shared = EbayService()
    private init() {}

    enum EbayServiceError: LocalizedError {
        case missingPrice
        case missingTitle
        case titleTooLong
        case saveFailed(Error)

        var errorDescription: String? {
            switch self {
            case .missingPrice:
                return "A listing price is required."
            case .missingTitle:
                return "A listing title is required."
            case .titleTooLong:
                return "Title must be 80 characters or fewer."
            case .saveFailed(let error):
                return "Failed to save listing: \(error.localizedDescription)"
            }
        }
    }

    /// Validates and "publishes" a listing. Currently generates a mock listing ID
    /// (format: `SLABR-XXXXXXXX`). Validates: price > 0, title non-empty, title <= 80 chars.
    /// Sets `listing.status` to `.listed` and `listing.listedDate` to now.
    func publishListing(listing: ListingRecord, context: NSManagedObjectContext) async throws -> String {
        guard let price = listing.listingPrice as Decimal?, price > 0 else {
            throw EbayServiceError.missingPrice
        }

        let title = listing.effectiveListingTitle
        guard !title.isEmpty else {
            throw EbayServiceError.missingTitle
        }
        guard title.count <= 80 else {
            throw EbayServiceError.titleTooLong
        }

        let mockId = "SLABR-\(UUID().uuidString.prefix(8))"

        listing.listingId = mockId
        listing.status = RecordStatus.listed.rawValue
        listing.listedDate = .now

        do {
            try context.save()
        } catch {
            throw EbayServiceError.saveFailed(error)
        }

        return mockId
    }

    func canPublish(listing: ListingRecord) -> Bool {
        guard let price = listing.listingPrice as Decimal?, price > 0 else { return false }
        let title = listing.effectiveListingTitle
        return !title.isEmpty && title.count <= 80
    }
}
