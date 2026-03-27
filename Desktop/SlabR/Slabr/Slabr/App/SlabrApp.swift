import SwiftUI
import CoreData

@main
struct SlabrApp: App {
    let persistenceController = PersistenceController.shared
    @StateObject private var subscriptionService = SubscriptionService()

    init() {
        SentrySetup.start()
        AppEnvironment.validateAtStartup()

        #if DEBUG
        if CommandLine.arguments.contains("--screenshot-mode") {
            // Ensure a userId exists (AppState.init will read the same value)
            let userId: String
            if let existing = KeychainHelper.read(key: KeychainKey.userId) {
                userId = existing
            } else {
                let newId = UUID().uuidString
                KeychainHelper.save(key: KeychainKey.userId, value: newId)
                userId = newId
            }
            // Mark onboarding complete so screenshots show the main UI
            KeychainHelper.save(key: KeychainKey.onboardingCompleted, value: "true")

            let context = persistenceController.container.viewContext
            SeedData.populate(context: context, userId: userId)
        }
        #endif
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(\.managedObjectContext, persistenceController.container.viewContext)
                .environmentObject(subscriptionService)
                .task {
                    AccessControl.subscriptionService = subscriptionService
                    await subscriptionService.loadProducts()
                }
        }
    }
}
