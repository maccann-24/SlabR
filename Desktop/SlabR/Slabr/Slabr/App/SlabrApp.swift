import SwiftUI
import CoreData

@main
struct SlabrApp: App {
    let persistenceController = PersistenceController.shared
    @StateObject private var subscriptionService = SubscriptionService()

    init() {
        SentrySetup.start()
        AppEnvironment.validateAtStartup()
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
