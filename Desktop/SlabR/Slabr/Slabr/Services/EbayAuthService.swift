import AuthenticationServices
import CryptoKit
import Foundation
import os

/// Manages the eBay OAuth 2.0 Authorization Code Grant flow.
///
/// Responsibilities:
/// - Opens `ASWebAuthenticationSession` for user consent
/// - Exchanges authorization codes for access + refresh tokens
/// - Refreshes expired access tokens using the long-lived refresh token
/// - Stores all tokens securely in Keychain
/// - Provides a single `getAccessToken()` entry point for other services
///
/// Token lifecycle:
/// - Access token: short-lived (~2 hours), auto-refreshed
/// - Refresh token: long-lived (~18 months), stored in Keychain
/// - Access token validity is checked with a 60-second safety buffer
final class EbayAuthService: NSObject {
    static let shared = EbayAuthService()

    private let scopes = [
        "https://api.ebay.com/oauth/api_scope/sell.inventory",
        "https://api.ebay.com/oauth/api_scope/sell.account",
        "https://api.ebay.com/oauth/api_scope/sell.fulfillment"
    ].joined(separator: " ")

    /// PKCE code verifier stored between `authenticate()` and `exchangeCodeForTokens()`.
    private var currentCodeVerifier: String?

    /// OAuth state parameter stored between `authenticate()` and callback validation.
    private var currentState: String?

    // MARK: - Errors

    enum EbayAuthError: LocalizedError {
        case authenticationCancelled
        case authenticationFailed(String)
        case tokenExchangeFailed(Int)
        case refreshFailed
        case notAuthenticated
        case networkError(Error)
        case missingConfiguration(String)

        var errorDescription: String? {
            switch self {
            case .authenticationCancelled:
                return "eBay sign-in was cancelled."
            case .authenticationFailed(let reason):
                return "eBay sign-in failed: \(reason)"
            case .tokenExchangeFailed(let statusCode):
                return "eBay token exchange failed (HTTP \(statusCode))."
            case .refreshFailed:
                return "eBay session expired. Please sign in again."
            case .notAuthenticated:
                return "Not signed in to eBay. Please connect your account."
            case .networkError:
                return "Check your connection and try again."
            case .missingConfiguration(let key):
                return "eBay configuration missing: \(key). Check build settings."
            }
        }
    }

    // MARK: - Public API

    /// Opens the eBay OAuth consent screen via `ASWebAuthenticationSession`.
    /// On success, the authorization code is exchanged for tokens and stored in Keychain.
    ///
    /// Must be called from a context where UI presentation is possible.
    /// The web authentication session is created on the main actor.
    func authenticate() async throws {
        let env = AppEnvironment.ebayEnvironment
        let clientId = AppEnvironment.ebayClientId
        let ruName = AppEnvironment.ebayRuName
        let urlScheme = AppEnvironment.urlScheme

        guard !clientId.isEmpty else {
            throw EbayAuthError.missingConfiguration("EBAY_CLIENT_ID")
        }
        guard !ruName.isEmpty else {
            throw EbayAuthError.missingConfiguration("EBAY_RUNAME")
        }
        guard !urlScheme.isEmpty else {
            throw EbayAuthError.missingConfiguration("URL_SCHEME")
        }

        let encodedScopes = scopes.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? scopes
        let encodedRuName = ruName.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ruName

        // PKCE (RFC 7636)
        let codeVerifier = generateCodeVerifier()
        let codeChallenge = generateCodeChallenge(from: codeVerifier)
        currentCodeVerifier = codeVerifier

        // State parameter (CSRF protection)
        let state = UUID().uuidString
        currentState = state

        let authURLString = "\(env.authBaseURL)/oauth2/authorize"
            + "?client_id=\(clientId)"
            + "&redirect_uri=\(encodedRuName)"
            + "&response_type=code"
            + "&scope=\(encodedScopes)"
            + "&code_challenge=\(codeChallenge)"
            + "&code_challenge_method=S256"
            + "&state=\(state)"

        guard let authURL = URL(string: authURLString) else {
            throw EbayAuthError.authenticationFailed("Invalid authorization URL")
        }

        Log.ebayAuth.info("Starting eBay OAuth flow")

        let callbackURL = try await startWebAuthSession(url: authURL, callbackScheme: urlScheme)

        guard let components = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false) else {
            throw EbayAuthError.authenticationFailed("Invalid callback URL")
        }

        // Validate state parameter to prevent CSRF attacks
        guard let returnedState = components.queryItems?.first(where: { $0.name == "state" })?.value,
              returnedState == currentState else {
            throw EbayAuthError.authenticationFailed("Invalid state parameter — possible CSRF attack")
        }

        guard let code = components.queryItems?.first(where: { $0.name == "code" })?.value else {
            throw EbayAuthError.authenticationFailed("No authorization code in callback")
        }

        Log.ebayAuth.info("Received authorization code, exchanging for tokens")
        try await exchangeCodeForTokens(code)
        Log.ebayAuth.info("eBay authentication completed successfully")
    }

    /// Returns a valid access token, refreshing if the current one has expired.
    /// Other services call this before making eBay API requests.
    ///
    /// - Throws: `EbayAuthError.notAuthenticated` if no refresh token exists.
    /// - Throws: `EbayAuthError.refreshFailed` if the refresh attempt fails.
    func getAccessToken() async throws -> String {
        guard isAuthenticated() else {
            throw EbayAuthError.notAuthenticated
        }

        if isAccessTokenValid(),
           let token = KeychainHelper.read(key: KeychainKey.ebayAccessToken) {
            return token
        }

        Log.ebayAuth.info("Access token expired or missing, refreshing")
        try await refreshAccessToken()

        guard let token = KeychainHelper.read(key: KeychainKey.ebayAccessToken) else {
            throw EbayAuthError.refreshFailed
        }
        return token
    }

    /// Checks whether the user has connected their eBay account.
    /// A refresh token in Keychain indicates an active connection (access token may be expired
    /// but can be refreshed).
    func isAuthenticated() -> Bool {
        KeychainHelper.read(key: KeychainKey.ebayRefreshToken) != nil
    }

    /// Removes all eBay credentials from Keychain, effectively signing the user out.
    func signOut() {
        KeychainHelper.delete(key: KeychainKey.ebayAccessToken)
        KeychainHelper.delete(key: KeychainKey.ebayRefreshToken)
        KeychainHelper.delete(key: KeychainKey.ebayTokenExpiry)
        KeychainHelper.delete(key: KeychainKey.ebayUsername)
        Log.ebayAuth.info("eBay account disconnected")
    }

    // MARK: - Private — Web Auth Session

    /// Wraps `ASWebAuthenticationSession` in an async/await continuation.
    /// The session must be created on the main actor since it presents UI.
    @MainActor
    private func startWebAuthSession(url: URL, callbackScheme: String) async throws -> URL {
        try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: callbackScheme
            ) { callbackURL, error in
                if let error = error as? ASWebAuthenticationSessionError {
                    if error.code == .canceledLogin {
                        continuation.resume(throwing: EbayAuthError.authenticationCancelled)
                    } else {
                        continuation.resume(throwing: EbayAuthError.authenticationFailed(error.localizedDescription))
                    }
                    return
                }

                if let error {
                    continuation.resume(throwing: EbayAuthError.authenticationFailed(error.localizedDescription))
                    return
                }

                guard let callbackURL else {
                    continuation.resume(throwing: EbayAuthError.authenticationFailed("No callback URL received"))
                    return
                }

                continuation.resume(returning: callbackURL)
            }

            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = true
            session.start()
        }
    }

    // MARK: - Private — Token Exchange

    /// Exchanges an authorization code for access and refresh tokens.
    private func exchangeCodeForTokens(_ code: String) async throws {
        let body = "grant_type=authorization_code"
            + "&code=\(urlEncode(code))"
            + "&redirect_uri=\(urlEncode(AppEnvironment.ebayRuName))"
            + "&code_verifier=\(urlEncode(currentCodeVerifier ?? ""))"

        let tokenResponse = try await performTokenRequest(body: body)

        storeTokens(
            access: tokenResponse.accessToken,
            refresh: tokenResponse.refreshToken,
            expiresIn: tokenResponse.expiresIn
        )
    }

    /// Refreshes the access token using the stored refresh token.
    private func refreshAccessToken() async throws {
        guard let refreshToken = KeychainHelper.read(key: KeychainKey.ebayRefreshToken) else {
            throw EbayAuthError.notAuthenticated
        }

        let body = "grant_type=refresh_token"
            + "&refresh_token=\(urlEncode(refreshToken))"
            + "&scope=\(urlEncode(scopes))"

        do {
            let tokenResponse = try await performTokenRequest(body: body)

            storeTokens(
                access: tokenResponse.accessToken,
                refresh: tokenResponse.refreshToken,
                expiresIn: tokenResponse.expiresIn
            )

            Log.ebayAuth.info("Access token refreshed successfully")
        } catch {
            Log.ebayAuth.error("Token refresh failed: \(error.localizedDescription, privacy: .public)")
            throw EbayAuthError.refreshFailed
        }
    }

    /// Performs a token endpoint request with the given URL-encoded body.
    /// Both code exchange and token refresh use the same endpoint and auth header.
    private func performTokenRequest(body: String) async throws -> TokenResponse {
        let env = AppEnvironment.ebayEnvironment
        let clientId = AppEnvironment.ebayClientId
        let clientSecret = AppEnvironment.ebayClientSecret

        guard let tokenURL = URL(string: "\(env.apiBaseURL)/identity/v1/oauth2/token") else {
            throw EbayAuthError.authenticationFailed("Invalid token endpoint URL")
        }

        let credentials = "\(clientId):\(clientSecret)"
        guard let credentialData = credentials.data(using: .utf8) else {
            throw EbayAuthError.authenticationFailed("Failed to encode credentials")
        }
        let base64Credentials = credentialData.base64EncodedString()

        var request = URLRequest(url: tokenURL)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        request.setValue("Basic \(base64Credentials)", forHTTPHeaderField: "Authorization")
        request.httpBody = body.data(using: .utf8)

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            throw EbayAuthError.networkError(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw EbayAuthError.tokenExchangeFailed(0)
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            Log.ebayAuth.error("Token request failed with HTTP \(httpResponse.statusCode)")
            throw EbayAuthError.tokenExchangeFailed(httpResponse.statusCode)
        }

        return try JSONDecoder().decode(TokenResponse.self, from: data)
    }

    // MARK: - Private — Token Storage

    /// Checks whether the stored access token is still valid (with a 60-second buffer).
    private func isAccessTokenValid() -> Bool {
        guard let expiryString = KeychainHelper.read(key: KeychainKey.ebayTokenExpiry),
              let expiryTimestamp = Double(expiryString) else {
            return false
        }
        return Date.now.timeIntervalSince1970 < (expiryTimestamp - 60)
    }

    /// Persists tokens to Keychain. If the response includes a new refresh token, it is updated;
    /// otherwise the existing refresh token is retained (eBay refresh responses may omit it).
    private func storeTokens(access: String, refresh: String?, expiresIn: Int) {
        KeychainHelper.save(key: KeychainKey.ebayAccessToken, value: access)

        if let refresh {
            KeychainHelper.save(key: KeychainKey.ebayRefreshToken, value: refresh)
        }

        let expiry = Date.now.addingTimeInterval(TimeInterval(expiresIn))
        KeychainHelper.save(
            key: KeychainKey.ebayTokenExpiry,
            value: String(expiry.timeIntervalSince1970)
        )
    }

    // MARK: - Private — PKCE (RFC 7636)

    /// Generates a cryptographically random code verifier (43-128 unreserved characters).
    private func generateCodeVerifier() -> String {
        var buffer = [UInt8](repeating: 0, count: 32)
        _ = SecRandomCopyBytes(kSecRandomDefault, buffer.count, &buffer)
        return Data(buffer).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    /// Produces the S256 code challenge: Base64-URL-encoded SHA-256 of the verifier.
    private func generateCodeChallenge(from verifier: String) -> String {
        let hash = SHA256.hash(data: Data(verifier.utf8))
        return Data(hash).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    // MARK: - Private — Helpers

    private static let urlEncodingAllowed: CharacterSet = {
        var allowed = CharacterSet.alphanumerics
        allowed.insert(charactersIn: "-._~")
        return allowed
    }()

    /// Percent-encodes a string using a restricted CharacterSet (alphanumerics + `-._~`).
    /// Stricter than `.urlQueryAllowed` to prevent `&`, `=`, and `+` from passing through.
    private func urlEncode(_ string: String) -> String {
        string.addingPercentEncoding(withAllowedCharacters: Self.urlEncodingAllowed) ?? string
    }
}

// MARK: - ASWebAuthenticationPresentationContextProviding

extension EbayAuthService: ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow } ?? ASPresentationAnchor()
    }
}

// MARK: - Response Types

private struct TokenResponse: Codable {
    let accessToken: String
    let expiresIn: Int
    let refreshToken: String?
    let tokenType: String

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case expiresIn = "expires_in"
        case refreshToken = "refresh_token"
        case tokenType = "token_type"
    }
}
