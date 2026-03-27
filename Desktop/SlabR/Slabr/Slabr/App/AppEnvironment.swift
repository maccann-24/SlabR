import Foundation
import os

enum AppEnvironment {

    enum EbayEnv: String {
        case sandbox
        case production

        var authBaseURL: String {
            switch self {
            case .sandbox: return "https://auth.sandbox.ebay.com"
            case .production: return "https://auth.ebay.com"
            }
        }

        var apiBaseURL: String {
            switch self {
            case .sandbox: return "https://api.sandbox.ebay.com"
            case .production: return "https://api.ebay.com"
            }
        }
    }

    // MARK: - eBay

    static var ebayClientId: String { info("EBAY_CLIENT_ID") }
    static var ebayClientSecret: String { info("EBAY_CLIENT_SECRET") }
    static var ebayRuName: String { info("EBAY_RUNAME") }
    static var ebayEnvironment: EbayEnv {
        EbayEnv(rawValue: info("EBAY_ENVIRONMENT")) ?? .sandbox
    }

    // MARK: - Sentry

    static var sentryDSN: String? { optionalInfo("SENTRY_DSN") }

    // MARK: - URL Scheme

    static var urlScheme: String { info("URL_SCHEME") }

    // MARK: - Validation

    static func validateAtStartup() {
        let required = ["EBAY_CLIENT_ID", "EBAY_CLIENT_SECRET", "EBAY_RUNAME", "EBAY_ENVIRONMENT", "URL_SCHEME"]
        for key in required {
            let value = Bundle.main.infoDictionary?[key] as? String ?? ""
            if value.isEmpty || value == "$(\(key))" || value == "PLACEHOLDER" {
                #if DEBUG
                Log.environment.warning("Missing or placeholder value for \(key, privacy: .public)")
                #else
                Log.environment.fault("Required config '\(key, privacy: .public)' is not set — app may not function correctly")
                #endif
            }
        }
    }

    // MARK: - Helpers

    private static func info(_ key: String) -> String {
        Bundle.main.infoDictionary?[key] as? String ?? ""
    }

    private static func optionalInfo(_ key: String) -> String? {
        guard let value = Bundle.main.infoDictionary?[key] as? String,
              !value.isEmpty,
              value != "$(\(key))" else {
            return nil
        }
        return value
    }
}
