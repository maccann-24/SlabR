import Foundation
import os

/// Model representing an eBay category with its full ancestry path.
struct EbayCategory: Identifiable, Equatable, Sendable {
    let id: String
    let name: String
    let parentPath: String
}

/// Suggests eBay categories for sports cards using the Taxonomy API.
///
/// Uses `GET /commerce/taxonomy/v1/category_tree/0/get_category_suggestions`
/// to auto-detect the best category from card metadata. Falls back to the
/// default "Sports Trading Cards" category (261328) on any failure.
enum EbayCategoryService {

    // MARK: - Default

    static let defaultCategory = EbayCategory(
        id: "261328",
        name: "Sports Trading Cards",
        parentPath: "Collectibles > Sports Memorabilia > Trading Cards"
    )

    // MARK: - Taxonomy API

    /// Queries the eBay Taxonomy API for category suggestions matching `query`.
    /// Returns an array of `EbayCategory` ordered by eBay's relevance ranking.
    /// Falls back to `[defaultCategory]` on network or parse failures.
    static func suggestCategory(for query: String) async throws -> [EbayCategory] {
        guard !query.trimmingCharacters(in: .whitespaces).isEmpty else {
            return [defaultCategory]
        }

        let token = try await EbayAuthService.shared.getAccessToken()
        let baseURL = AppEnvironment.ebayEnvironment.apiBaseURL
        let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query

        guard let url = URL(string: "\(baseURL)/commerce/taxonomy/v1/category_tree/0/get_category_suggestions?q=\(encoded)") else {
            Log.ebay.error("Invalid category suggestions URL")
            return [defaultCategory]
        }

        var request = URLRequest(url: url)
        request.timeoutInterval = 30
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            Log.ebay.error("Category suggestions network error: \(error.localizedDescription, privacy: .public)")
            return [defaultCategory]
        }

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
            Log.ebay.error("Category suggestions failed HTTP \(statusCode)")
            return [defaultCategory]
        }

        return parseSuggestions(from: data)
    }

    /// Builds a search query string from card metadata for the Taxonomy API.
    /// Example output: "Mike Trout Topps Baseball trading card"
    static func suggestFromCard(
        playerName: String?,
        brand: String?,
        sport: String = "Baseball"
    ) -> String {
        [playerName, brand, sport, "trading card"]
            .compactMap { $0?.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
            .joined(separator: " ")
    }

    // MARK: - Private

    /// Parses the eBay Taxonomy `categorySuggestions` response into `[EbayCategory]`.
    /// Returns `[defaultCategory]` if the response cannot be decoded.
    private static func parseSuggestions(from data: Data) -> [EbayCategory] {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let suggestions = json["categorySuggestions"] as? [[String: Any]] else {
            Log.ebay.warning("Failed to parse category suggestions response")
            return [defaultCategory]
        }

        let categories: [EbayCategory] = suggestions.compactMap { suggestion in
            guard let category = suggestion["category"] as? [String: Any],
                  let categoryId = category["categoryId"] as? String,
                  let categoryName = category["categoryName"] as? String else {
                return nil
            }

            // Build parent path from ancestors
            let ancestors = suggestion["categoryTreeNodeAncestors"] as? [[String: Any]] ?? []
            let ancestorNames = ancestors.compactMap { $0["categoryName"] as? String }
            let parentPath = (ancestorNames.reversed() + [categoryName]).joined(separator: " > ")

            return EbayCategory(id: categoryId, name: categoryName, parentPath: parentPath)
        }

        guard !categories.isEmpty else {
            return [defaultCategory]
        }

        return categories
    }
}
