import SwiftUI
import CoreData

@main
struct SlabrApp: App {
    let persistenceController = PersistenceController.shared

    init() {
        SentrySetup.start()
        AppEnvironment.validateAtStartup()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(\.managedObjectContext, persistenceController.container.viewContext)
        }
    }
}
