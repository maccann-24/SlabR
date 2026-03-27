import Foundation
import os

@MainActor
final class EbayAccountViewModel: ObservableObject {
    @Published var isLinked: Bool = false
    @Published var username: String = ""
    @Published var isLoading: Bool = false
    @Published var error: String?

    // MARK: - Public API

    func checkLinkStatus() {
        isLinked = EbayAuthService.shared.isAuthenticated()
        username = KeychainHelper.read(key: KeychainKey.ebayUsername) ?? ""
    }

    func linkAccount() async {
        isLoading = true
        error = nil
        do {
            try await EbayAuthService.shared.authenticate()
            checkLinkStatus()
            HapticManager.shared.postSuccess()
            Log.ebayAuth.info("eBay account linked successfully")
        } catch EbayAuthService.EbayAuthError.authenticationCancelled {
            // User cancelled — no error to show
            Log.ebayAuth.info("eBay link cancelled by user")
        } catch {
            self.error = error.localizedDescription
            HapticManager.shared.postFailed()
            Log.ebayAuth.error("eBay link failed: \(error.localizedDescription, privacy: .public)")
        }
        isLoading = false
    }

    func unlinkAccount() {
        EbayAuthService.shared.signOut()
        isLinked = false
        username = ""
        HapticManager.shared.postSuccess()
        Log.ebayAuth.info("eBay account unlinked by user")
    }
}
