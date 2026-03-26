import Foundation

enum PSAServiceError: LocalizedError {
    case notAuthenticated
    case invalidCredentials
    case certNotFound
    case serverError(Int)
    case networkError(Error)

    var errorDescription: String? {
        switch self {
        case .notAuthenticated: return "PSA session expired. Please sign in again."
        case .invalidCredentials: return "Invalid credentials. Check your username and password."
        case .certNotFound: return "Cert not found in PSA database."
        case .serverError(let code): return "PSA server error (\(code)). Try again later."
        case .networkError: return "Check your connection and try again."
        }
    }
}

/// Client for the PSA (Professional Sports Authenticator) public API.
/// Handles OAuth token-based authentication and cert number lookup.
/// Conforms to `PSAServiceProtocol` for testability via mock injection.
final class PSAService {
    static let shared = PSAService()
    private init() {}

    private let baseURL = "https://api.psacard.com/publicapi"

    // MARK: - Auth

    /// Authenticates with the PSA API using password grant.
    /// Credentials are URL-encoded with a restricted CharacterSet (alphanumerics + `-._~`)
    /// to prevent injection of `&`, `=`, or `+` into the form body.
    /// The resulting token and expiry are stored in the Keychain.
    func authenticate(username: String, password: String) async throws {
        guard let url = URL(string: "\(baseURL)/auth/token") else {
            throw PSAServiceError.serverError(0)
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")

        let body = "grant_type=password&username=\(try urlEncode(username))&password=\(try urlEncode(password))"
        request.httpBody = body.data(using: .utf8)

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            throw PSAServiceError.networkError(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw PSAServiceError.serverError(0)
        }

        // PSA returns 500 for bad credentials
        if httpResponse.statusCode == 500 {
            throw PSAServiceError.invalidCredentials
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw PSAServiceError.serverError(httpResponse.statusCode)
        }

        let tokenResponse = try JSONDecoder().decode(TokenResponse.self, from: data)
        KeychainHelper.save(key: KeychainKey.psaToken, value: tokenResponse.accessToken)
        let expiry = Date.now.addingTimeInterval(TimeInterval(tokenResponse.expiresIn))
        KeychainHelper.save(key: KeychainKey.psaTokenExpiry, value: String(expiry.timeIntervalSince1970))
    }

    // MARK: - Cert Lookup

    /// Looks up a PSA cert by number. The cert number is percent-encoded in the URL path.
    /// Returns a `PSACard` with grade, player, set info, and population data.
    func lookupCert(_ certNumber: String) async throws -> PSACard {
        guard let token = KeychainHelper.read(key: KeychainKey.psaToken),
              isTokenValid() else {
            throw PSAServiceError.notAuthenticated
        }

        let encodedCert = try urlEncode(certNumber)
        guard let url = URL(string: "\(baseURL)/cert/GetByCertNumber/\(encodedCert)") else {
            throw PSAServiceError.serverError(0)
        }
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            throw PSAServiceError.networkError(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw PSAServiceError.serverError(0)
        }

        if httpResponse.statusCode == 404 {
            throw PSAServiceError.certNotFound
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw PSAServiceError.serverError(httpResponse.statusCode)
        }

        let certResponse = try JSONDecoder().decode(CertResponse.self, from: data)

        guard let cert = certResponse.psaCert else {
            throw PSAServiceError.certNotFound
        }

        return PSACard(
            certNumber: cert.certNumber ?? certNumber,
            playerName: cert.subject ?? "Unknown",
            year: cert.year ?? "",
            brand: cert.brandName ?? "",
            setName: cert.series ?? "",
            cardNumber: cert.cardNumber ?? "",
            parallel: cert.variety,
            grade: cert.totalGrade ?? "",
            gradeDescription: cert.gradingDescription ?? "",
            isRookie: cert.qualifierDescription?.lowercased().contains("rookie") ?? false,
            population: cert.popHigher
        )
    }

    // MARK: - Helpers

    private func isTokenValid() -> Bool {
        guard let expiryString = KeychainHelper.read(key: KeychainKey.psaTokenExpiry),
              let expiryTimestamp = Double(expiryString) else {
            return false
        }
        return Date.now.timeIntervalSince1970 < (expiryTimestamp - 60)
    }

    private static let urlEncodingAllowed: CharacterSet = {
        var allowed = CharacterSet.alphanumerics
        allowed.insert(charactersIn: "-._~")
        return allowed
    }()

    /// Percent-encodes a string using a restricted CharacterSet (alphanumerics + `-._~`).
    /// This is stricter than `.urlQueryAllowed` to prevent `&`, `=`, and `+` from passing
    /// through unencoded in OAuth form bodies — a security fix for CWE-116.
    func urlEncode(_ string: String) throws -> String {
        let allowed = Self.urlEncodingAllowed
        guard let encoded = string.addingPercentEncoding(withAllowedCharacters: allowed) else {
            Log.psa.error("URL encoding failed for input")
            throw PSAServiceError.serverError(0)
        }
        return encoded
    }
}

// MARK: - Response Types

private struct TokenResponse: Codable {
    let accessToken: String
    let expiresIn: Int

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case expiresIn = "expires_in"
    }
}

private struct CertResponse: Codable {
    let psaCert: PSACert?

    enum CodingKeys: String, CodingKey {
        case psaCert = "PSACert"
    }
}

private struct PSACert: Codable {
    let certNumber: String?
    let subject: String?
    let year: String?
    let brandName: String?
    let series: String?
    let cardNumber: String?
    let variety: String?
    let totalGrade: String?
    let gradingDescription: String?
    let qualifierDescription: String?
    let popHigher: Int?

    enum CodingKeys: String, CodingKey {
        case certNumber = "CertNumber"
        case subject = "Subject"
        case year = "Year"
        case brandName = "BrandName"
        case series = "Series"
        case cardNumber = "CardNumber"
        case variety = "Variety"
        case totalGrade = "TotalGrade"
        case gradingDescription = "GradingDescription"
        case qualifierDescription = "QualifierDescription"
        case popHigher = "PopHigher"
    }
}
