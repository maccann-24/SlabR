import SwiftUI

@MainActor
final class AppState: ObservableObject {
    @Published var selectedTab: Tab = .home
    @Published var showEntryPointSheet = false
    @Published var showPSAImport = false
    @Published var showCamera = false
    @Published var pendingEntryPoint: EntryPoint?
    @Published var hasCompletedOnboarding: Bool = true

    enum EntryPoint {
        case psaImport
        case camera
    }

    enum Tab: Int, CaseIterable {
        case home
        case listings
        case add // FAB — not a real tab destination
        case analytics
        case settings
    }

    /// Locally generated UUID stored in Keychain. Cached as a `let` at init time
    /// to avoid repeated Keychain reads. Designed for future backend migration.
    let userId: String

    init() {
        if let existing = KeychainHelper.read(key: KeychainKey.userId) {
            self.userId = existing
            // Existing users skip onboarding
            if KeychainHelper.read(key: KeychainKey.onboardingCompleted) == nil {
                KeychainHelper.save(key: KeychainKey.onboardingCompleted, value: "true")
            }
            self.hasCompletedOnboarding = true
        } else {
            let newId = UUID().uuidString
            KeychainHelper.save(key: KeychainKey.userId, value: newId)
            KeychainHelper.save(key: KeychainKey.trialStartDate, value: AccessControl.iso8601Formatter.string(from: Date()))
            self.userId = newId
            self.hasCompletedOnboarding = false
        }
    }

    func completeOnboarding() {
        KeychainHelper.save(key: KeychainKey.onboardingCompleted, value: "true")
        hasCompletedOnboarding = true
    }
}

/// Minimal Keychain wrapper for tokens and userId.
/// Items are stored with `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` — they are
/// hardware-encrypted, excluded from backups, and inaccessible on other devices.
/// Errors are logged via `Log.keychain` at the `error` level.
enum KeychainKey {
    static let userId = "userId"
    static let psaToken = "psaToken"
    static let psaTokenExpiry = "psaTokenExpiry"
    static let trialStartDate = "trialStartDate"
    static let onboardingCompleted = "onboardingCompleted"
    static let ebayAccessToken = "ebayAccessToken"
    static let ebayRefreshToken = "ebayRefreshToken"
    static let ebayTokenExpiry = "ebayTokenExpiry"
    static let ebayUsername = "ebayUsername"
}

enum KeychainHelper {
    private static let serviceName = "com.exosource.slabr"

    /// Saves a UTF-8 string to the Keychain. Deletes any existing value first (upsert pattern).
    /// Returns `true` on success. Logs `OSStatus` on failure.
    @discardableResult
    static func save(key: String, value: String) -> Bool {
        guard let data = value.data(using: .utf8) else { return false }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]
        SecItemDelete(query as CFDictionary)
        let status = SecItemAdd(query as CFDictionary, nil)
        if status != errSecSuccess {
            Log.keychain.error("Save failed for key '\(key, privacy: .public)': OSStatus \(status)")
        }
        return status == errSecSuccess
    }

    static func read(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key
        ]
        let status = SecItemDelete(query as CFDictionary)
        if status != errSecSuccess && status != errSecItemNotFound {
            Log.keychain.error("Delete failed for key '\(key, privacy: .public)': OSStatus \(status)")
        }
    }
}
