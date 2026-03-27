import CoreData

@MainActor
final class SettingsViewModel: ObservableObject {
    @Published var sellerMode: SellerMode = .regular

    private var context: NSManagedObjectContext?
    private var userId: String = ""

    var isConfigured: Bool { context != nil }

    func configure(context: NSManagedObjectContext, userId: String) {
        guard self.context == nil else { return }
        self.context = context
        self.userId = userId
    }

    func loadSellerMode() {
        guard let context else { return }
        guard let entity = Self.fetchOrCreateSettings(context: context, userId: userId) else { return }
        sellerMode = SellerMode(legacyValue: entity.sellerMode ?? "regular")
    }

    func saveSellerMode(_ mode: SellerMode) {
        guard let context else { return }
        guard let entity = Self.fetchOrCreateSettings(context: context, userId: userId) else { return }
        entity.sellerMode = mode.rawValue
        do {
            try context.save()
            sellerMode = mode
        } catch {
            Log.settings.error("Failed to save seller mode: \(error)")
        }
    }

    // MARK: - eBay Link Status

    var isEbayLinked: Bool {
        EbayAuthService.shared.isAuthenticated()
    }

    // MARK: - Access Control

    func isTrialActive() -> Bool {
        AccessControl.isTrialActive()
    }

    func trialDaysRemaining() -> Int {
        AccessControl.trialDaysRemaining()
    }

    func currentTier(userId: String) -> AccessControl.SubscriptionTier {
        AccessControl.currentTier(userId: userId)
    }

    func canAccessSpeedMode(userId: String) -> Bool {
        AccessControl.hasAccess(userId: userId, feature: .speedMode)
    }

    // MARK: - Delete All Data

    func deleteAllData(context: NSManagedObjectContext, appState: AppState) {
        // 1. Delete all Core Data entities
        let entities = [
            "ListingRecord", "CardRecord", "MediaRecord",
            "ShippingProfileEntity", "ListingTemplateEntity", "UserSettingsEntity"
        ]
        for entityName in entities {
            let request = NSFetchRequest<NSFetchRequestResult>(entityName: entityName)
            let deleteRequest = NSBatchDeleteRequest(fetchRequest: request)
            deleteRequest.resultType = .resultTypeObjectIDs
            do {
                let result = try context.execute(deleteRequest) as? NSBatchDeleteResult
                if let objectIDs = result?.result as? [NSManagedObjectID] {
                    NSManagedObjectContext.mergeChanges(
                        fromRemoteContextSave: [NSDeletedObjectsKey: objectIDs],
                        into: [context]
                    )
                }
            } catch {
                Log.settings.error("Failed to delete \(entityName): \(error)")
            }
        }

        // 2. Delete all Keychain keys
        let keychainKeys = [
            KeychainKey.userId, KeychainKey.onboardingCompleted,
            KeychainKey.psaToken, KeychainKey.psaTokenExpiry,
            KeychainKey.ebayAccessToken, KeychainKey.ebayRefreshToken,
            KeychainKey.ebayTokenExpiry, KeychainKey.ebayUsername
        ]
        for key in keychainKeys {
            KeychainHelper.delete(key: key)
        }

        // 3. Reset app state to trigger onboarding
        appState.hasCompletedOnboarding = false

        Log.settings.info("All user data deleted")
    }

    // MARK: - Shared Helper

    static func fetchOrCreateSettings(context: NSManagedObjectContext, userId: String) -> UserSettingsEntity? {
        let request = NSFetchRequest<UserSettingsEntity>(entityName: "UserSettingsEntity")
        request.predicate = NSPredicate(format: "userId == %@", userId)
        request.fetchLimit = 1
        do {
            if let existing = try context.fetch(request).first {
                return existing
            }
            let entity = UserSettingsEntity(context: context)
            entity.userId = userId
            return entity
        } catch {
            Log.settings.error("Failed to fetch/create settings: \(error)")
            return nil
        }
    }
}
