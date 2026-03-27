#if DEBUG
import Foundation

/// eBay listing service. **Currently a mock** — generates fake listing IDs.
/// Does not make real eBay API calls.
/// Conforms to `EbayServiceProtocol` for testability via mock injection.
final class EbayService {
    static let shared = EbayService()
    private init() {}

    enum EbayServiceError: LocalizedError {
        case missingPrice
        case missingTitle
        case titleTooLong

        var errorDescription: String? {
            switch self {
            case .missingPrice:
                return "A listing price is required."
            case .missingTitle:
                return "A listing title is required."
            case .titleTooLong:
                return "Title must be 80 characters or fewer."
            }
        }
    }

    /// Validates and "publishes" a listing. Currently generates a mock listing ID
    /// (format: `SLABR-XXXXXXXX`). Validates: price > 0, title non-empty, title <= 80 chars.
    /// Core Data mutations are handled by the caller — this service is persistence-agnostic.
    func publishListing(request: ListingPublishRequest) async throws -> String {
        guard request.price > 0 else {
            throw EbayServiceError.missingPrice
        }
        guard !request.title.isEmpty else {
            throw EbayServiceError.missingTitle
        }
        guard request.title.count <= 80 else {
            throw EbayServiceError.titleTooLong
        }

        return "SLABR-\(UUID().uuidString.prefix(8))"
    }

    func canPublish(request: ListingPublishRequest) -> Bool {
        request.price > 0 && !request.title.isEmpty && request.title.count <= 80
    }
}
#endif
