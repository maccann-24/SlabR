import CoreData

/// Core Data stack. Configures lightweight migration, `FileProtectionType.complete`
/// (encryption at rest), and auto-merging of parent context changes.
/// Use `PersistenceController(inMemory: true)` for tests and SwiftUI previews.
struct PersistenceController {
    static let shared = PersistenceController()

    @MainActor
    static let preview: PersistenceController = {
        let result = PersistenceController(inMemory: true)
        return result
    }()

    let container: NSPersistentContainer

    init(inMemory: Bool = false) {
        container = NSPersistentContainer(name: "Slabr")
        if inMemory {
            container.persistentStoreDescriptions.first?.url = URL(fileURLWithPath: "/dev/null")
        }
        if let description = container.persistentStoreDescriptions.first {
            description.setOption(true as NSNumber, forKey: NSMigratePersistentStoresAutomaticallyOption)
            description.setOption(true as NSNumber, forKey: NSInferMappingModelAutomaticallyOption)
            description.setOption(
                FileProtectionType.complete as NSObject,
                forKey: NSPersistentStoreFileProtectionKey
            )
        }
        container.loadPersistentStores { _, error in
            if let error = error as NSError? {
                #if DEBUG
                fatalError("Core Data store failed to load: \(error), \(error.userInfo)")
                #else
                Log.coreData.fault("Persistent store failed to load: \(error), \(error.userInfo)")
                #endif
            }
        }
        container.viewContext.automaticallyMergesChangesFromParent = true
    }
}
