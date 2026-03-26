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
