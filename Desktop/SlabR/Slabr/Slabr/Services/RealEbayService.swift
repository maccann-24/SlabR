import Foundation
import os

/// Real eBay Inventory API service for creating live listings.
///
/// Flow: Upload image -> Create inventory item -> Create offer -> Publish offer.
/// Uses `EbayAuthService` for OAuth tokens and `EbayImageService` for image hosting.
/// Conforms to `EbayServiceProtocol` so it can replace the mock `EbayService`.
final class RealEbayService: EbayServiceProtocol {
    static let shared = RealEbayService()
    private init() {}

    // MARK: - Errors

    enum InventoryError: LocalizedError {
        case invalidURL
        case createItemFailed(Int, String)
        case createOfferFailed(Int, String)
        case publishOfferFailed(Int, String)
        case noOfferId
        case noListingId
        case networkError(Error)
        case missingFulfillmentPolicy
        case missingReturnPolicy
        case missingPaymentPolicy

        var errorDescription: String? {
            switch self {
            case .invalidURL:
                return "Invalid eBay API URL."
            case .createItemFailed(let status, let detail):
                return "Failed to create inventory item (HTTP \(status)): \(detail)"
            case .createOfferFailed(let status, let detail):
                return "Failed to create offer (HTTP \(status)): \(detail)"
            case .publishOfferFailed(let status, let detail):
                return "Failed to publish offer (HTTP \(status)): \(detail)"
            case .noOfferId:
                return "eBay did not return an offer ID."
            case .noListingId:
                return "eBay did not return a listing ID."
            case .networkError(let error):
                return "Network error: \(error.localizedDescription)"
            case .missingFulfillmentPolicy:
                return "No shipping policy found. Create one in eBay Seller Hub before listing."
            case .missingReturnPolicy:
                return "No return policy found. Create one in eBay Seller Hub before listing."
            case .missingPaymentPolicy:
                return "No payment policy found. Create one in eBay Seller Hub before listing."
            }
        }
    }

    // MARK: - Business Policy Cache

    /// Cached business policy IDs. Checked once per app session to avoid redundant API calls.
    private struct BusinessPolicies {
        let fulfillmentPolicyId: String
        let returnPolicyId: String
        let paymentPolicyId: String
    }

    private static let policiesLock = OSAllocatedUnfairLock<BusinessPolicies?>(initialState: nil)

    // MARK: - EbayServiceProtocol

    func publishListing(request: ListingPublishRequest) async throws -> String {
        let token = try await EbayAuthService.shared.getAccessToken()
        let baseURL = AppEnvironment.ebayEnvironment.apiBaseURL

        // Step 1: Upload image if available
        var imageURL: String?
        if let imageData = request.imageData {
            Log.ebay.info("Uploading listing image")
            imageURL = try await EbayImageService.uploadImage(imageData)
        }

        // Step 2: Check business policies (cached after first call)
        let policies = try await checkBusinessPolicies(token: token, baseURL: baseURL)

        // Step 3: Create inventory item
        let sku = "SLABR-\(UUID().uuidString)"
        Log.ebay.info("Creating inventory item: \(sku, privacy: .public)")
        try await createInventoryItem(
            sku: sku,
            request: request,
            imageURL: imageURL,
            token: token,
            baseURL: baseURL
        )

        // Step 4: Create offer with business policy IDs
        Log.ebay.info("Creating offer for SKU: \(sku, privacy: .public)")
        let offerId = try await createOffer(
            sku: sku,
            request: request,
            policies: policies,
            token: token,
            baseURL: baseURL
        )

        // Step 5: Publish offer
        Log.ebay.info("Publishing offer: \(offerId, privacy: .public)")
        let listingId = try await publishOffer(
            offerId: offerId,
            token: token,
            baseURL: baseURL
        )

        Log.ebay.info("Listing published successfully: \(listingId, privacy: .public)")
        return listingId
    }

    func canPublish(request: ListingPublishRequest) -> Bool {
        request.price > 0 && !request.title.isEmpty && request.title.count <= 80
    }

    // MARK: - Inventory Item

    /// Creates an inventory item via `PUT /sell/inventory/v1/inventory_item/{sku}`.
    private func createInventoryItem(
        sku: String,
        request: ListingPublishRequest,
        imageURL: String?,
        token: String,
        baseURL: String
    ) async throws {
        guard let url = URL(string: "\(baseURL)/sell/inventory/v1/inventory_item/\(sku)") else {
            throw InventoryError.invalidURL
        }

        var aspects: [String: [String]] = [:]
        if let sport = sportFromCategory(request.categoryId) {
            aspects["Sport"] = [sport]
        }
        if let player = request.playerName, !player.isEmpty {
            aspects["Player/Athlete"] = [player]
        }
        if let year = request.year, !year.isEmpty {
            aspects["Season"] = [year]
        }
        if let brand = request.brand, !brand.isEmpty {
            aspects["Manufacturer"] = [brand]
        }
        if let cardNumber = request.cardNumber, !cardNumber.isEmpty {
            aspects["Card Number"] = [cardNumber]
        }

        var product: [String: Any] = [
            "title": request.title
        ]

        if let description = request.description, !description.isEmpty {
            product["description"] = description
        }

        if let imageURL {
            product["imageUrls"] = [imageURL]
        }

        if !aspects.isEmpty {
            product["aspects"] = aspects
        }

        var body: [String: Any] = [
            "product": product,
            "availability": [
                "shipToLocationAvailability": [
                    "quantity": 1
                ]
            ]
        ]

        // Map condition for eBay
        let ebayCondition = mapConditionToEbay(request.condition, grade: request.grade)
        body["condition"] = ebayCondition.condition

        if let conditionDescription = ebayCondition.description {
            body["conditionDescription"] = conditionDescription
        }

        let jsonData = try JSONSerialization.data(withJSONObject: body)

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "PUT"
        urlRequest.timeoutInterval = 30
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.setValue("en-US", forHTTPHeaderField: "Content-Language")
        urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        urlRequest.httpBody = jsonData

        let (data, response) = try await performRequest(urlRequest)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw InventoryError.createItemFailed(0, "Invalid response")
        }

        // PUT inventory_item returns 200 (update) or 204 (create) on success
        guard (200...204).contains(httpResponse.statusCode) else {
            let detail = String(data: data, encoding: .utf8) ?? "Unknown error"
            Log.ebay.error("Create inventory item failed HTTP \(httpResponse.statusCode): \(detail, privacy: .public)")
            throw InventoryError.createItemFailed(httpResponse.statusCode, detail)
        }
    }

    // MARK: - Offer

    /// Creates an offer via `POST /sell/inventory/v1/offer`.
    /// Includes business policy IDs (fulfillment, return, payment) validated in the pre-check step.
    /// Returns the offer ID.
    private func createOffer(
        sku: String,
        request: ListingPublishRequest,
        policies: BusinessPolicies,
        token: String,
        baseURL: String
    ) async throws -> String {
        guard let url = URL(string: "\(baseURL)/sell/inventory/v1/offer") else {
            throw InventoryError.invalidURL
        }

        let body: [String: Any] = [
            "sku": sku,
            "marketplaceId": "EBAY_US",
            "format": request.format,
            "pricingSummary": [
                "price": [
                    "value": "\(request.price)",
                    "currency": "USD"
                ]
            ],
            "categoryId": request.categoryId,
            "listingDescription": request.description ?? "",
            "availableQuantity": 1,
            "listingPolicies": [
                "fulfillmentPolicyId": policies.fulfillmentPolicyId,
                "returnPolicyId": policies.returnPolicyId,
                "paymentPolicyId": policies.paymentPolicyId
            ]
        ]

        let jsonData = try JSONSerialization.data(withJSONObject: body)

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.timeoutInterval = 30
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.setValue("en-US", forHTTPHeaderField: "Content-Language")
        urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        urlRequest.httpBody = jsonData

        let (data, response) = try await performRequest(urlRequest)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw InventoryError.createOfferFailed(0, "Invalid response")
        }

        guard (200...201).contains(httpResponse.statusCode) else {
            let detail = String(data: data, encoding: .utf8) ?? "Unknown error"
            Log.ebay.error("Create offer failed HTTP \(httpResponse.statusCode): \(detail, privacy: .public)")
            throw InventoryError.createOfferFailed(httpResponse.statusCode, detail)
        }

        // Parse offer ID from response
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let offerId = json["offerId"] as? String else {
            throw InventoryError.noOfferId
        }

        return offerId
    }

    /// Publishes an offer via `POST /sell/inventory/v1/offer/{offerId}/publish`.
    /// Returns the eBay listing ID.
    private func publishOffer(
        offerId: String,
        token: String,
        baseURL: String
    ) async throws -> String {
        guard let url = URL(string: "\(baseURL)/sell/inventory/v1/offer/\(offerId)/publish") else {
            throw InventoryError.invalidURL
        }

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.timeoutInterval = 30
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await performRequest(urlRequest)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw InventoryError.publishOfferFailed(0, "Invalid response")
        }

        guard httpResponse.statusCode == 200 else {
            let detail = String(data: data, encoding: .utf8) ?? "Unknown error"
            Log.ebay.error("Publish offer failed HTTP \(httpResponse.statusCode): \(detail, privacy: .public)")
            throw InventoryError.publishOfferFailed(httpResponse.statusCode, detail)
        }

        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let listingId = json["listingId"] as? String else {
            throw InventoryError.noListingId
        }

        return listingId
    }

    // MARK: - Business Policy Pre-Check

    /// Fetches required eBay business policies (fulfillment, return, payment).
    /// Returns cached results after the first successful check per session.
    /// Throws descriptive errors if any required policy type is missing.
    private func checkBusinessPolicies(
        token: String,
        baseURL: String
    ) async throws -> BusinessPolicies {
        if let cached = Self.policiesLock.withLock({ $0 }) {
            return cached
        }

        Log.ebay.info("Checking eBay business policies")

        async let fulfillmentId = fetchFirstPolicyId(
            endpoint: "\(baseURL)/sell/account/v1/fulfillment_policy?marketplace_id=EBAY_US",
            policyKey: "fulfillmentPolicies",
            idKey: "fulfillmentPolicyId",
            token: token,
            missingError: .missingFulfillmentPolicy
        )

        async let returnId = fetchFirstPolicyId(
            endpoint: "\(baseURL)/sell/account/v1/return_policy?marketplace_id=EBAY_US",
            policyKey: "returnPolicies",
            idKey: "returnPolicyId",
            token: token,
            missingError: .missingReturnPolicy
        )

        async let paymentId = fetchFirstPolicyId(
            endpoint: "\(baseURL)/sell/account/v1/payment_policy?marketplace_id=EBAY_US",
            policyKey: "paymentPolicies",
            idKey: "paymentPolicyId",
            token: token,
            missingError: .missingPaymentPolicy
        )

        let policies = try await BusinessPolicies(
            fulfillmentPolicyId: fulfillmentId,
            returnPolicyId: returnId,
            paymentPolicyId: paymentId
        )

        Self.policiesLock.withLock { $0 = policies }
        Log.ebay.info("Business policies verified — fulfillment: \(policies.fulfillmentPolicyId, privacy: .public), return: \(policies.returnPolicyId, privacy: .public), payment: \(policies.paymentPolicyId, privacy: .public)")
        return policies
    }

    /// Fetches a single policy type and returns the first policy's ID.
    /// Throws the specified error if no policies exist for that type.
    private func fetchFirstPolicyId(
        endpoint: String,
        policyKey: String,
        idKey: String,
        token: String,
        missingError: InventoryError
    ) async throws -> String {
        guard let url = URL(string: endpoint) else {
            throw InventoryError.invalidURL
        }

        var request = URLRequest(url: url)
        request.timeoutInterval = 30
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        let (data, response) = try await performRequest(request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
            let detail = String(data: data, encoding: .utf8) ?? "Unknown error"
            Log.ebay.error("Policy check failed for \(policyKey, privacy: .public) HTTP \(statusCode): \(detail, privacy: .public)")
            throw missingError
        }

        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let policies = json[policyKey] as? [[String: Any]],
              let firstPolicy = policies.first,
              let policyId = firstPolicy[idKey] as? String else {
            Log.ebay.warning("No \(policyKey, privacy: .public) found on eBay account")
            throw missingError
        }

        return policyId
    }

    // MARK: - Helpers

    /// Performs a URLSession request with centralized error handling.
    private func performRequest(_ request: URLRequest) async throws -> (Data, URLResponse) {
        do {
            return try await URLSession.shared.data(for: request)
        } catch {
            throw InventoryError.networkError(error)
        }
    }

    /// Maps the app's condition string to eBay's condition enum and optional description.
    internal func mapConditionToEbay(
        _ condition: String?,
        grade: String?
    ) -> (condition: String, description: String?) {
        // PSA-graded cards are always "LIKE_NEW" with grade in description
        if let grade, !grade.isEmpty {
            return ("LIKE_NEW", "PSA \(grade)")
        }

        // Map raw card conditions to eBay condition enums
        guard let condition else {
            return ("LIKE_NEW", nil)
        }

        switch condition {
        case CardCondition.gemMint.rawValue,
             CardCondition.nearMintMint.rawValue:
            return ("LIKE_NEW", condition)
        case CardCondition.nearMint.rawValue,
             CardCondition.excellentMint.rawValue:
            return ("VERY_GOOD", condition)
        case CardCondition.excellent.rawValue,
             CardCondition.veryGoodExcellent.rawValue:
            return ("GOOD", condition)
        case CardCondition.veryGood.rawValue,
             CardCondition.good.rawValue,
             CardCondition.poor.rawValue:
            return ("ACCEPTABLE", condition)
        default:
            return ("LIKE_NEW", condition)
        }
    }

    /// Infers the sport from the eBay category ID.
    /// Defaults to "Baseball" for the standard sports trading cards category.
    private func sportFromCategory(_ categoryId: String) -> String? {
        switch categoryId {
        case "261328": return "Baseball"
        case "214044": return "Basketball"
        case "261329": return "Football"
        case "261330": return "Hockey"
        case "261331": return "Soccer"
        default: return nil
        }
    }
}
