import CoreData

@MainActor
final class ListingsViewModel: ObservableObject {
    @Published var drafts: [ListingRecord] = []
    @Published var listed: [ListingRecord] = []

    private var context: NSManagedObjectContext?
    private var userId: String = ""

    /// Injects the managed object context and userId. Must be called from `onAppear`
    /// because `@Environment` values aren't available at `@StateObject` init time.
    func configure(context: NSManagedObjectContext, userId: String) {
        self.context = context
        self.userId = userId
    }

    func load() {
        drafts = fetchRecords(status: RecordStatus.draft.rawValue)
        listed = fetchRecords(status: RecordStatus.listed.rawValue)
    }

    private func fetchRecords(status: String) -> [ListingRecord] {
        guard let context else {
            Log.listings.fault("fetchRecords called before configure(context:userId:)")
            return []
        }
        let request = NSFetchRequest<ListingRecord>(entityName: "ListingRecord")
        request.predicate = NSPredicate(format: "userId == %@ AND status == %@", userId, status)
        request.sortDescriptors = [NSSortDescriptor(key: "date", ascending: false)]
        request.fetchBatchSize = 20
        request.relationshipKeyPathsForPrefetching = ["card", "media"]

        do {
            return try context.fetch(request)
        } catch {
            Log.listings.error("Fetch failed for status '\(status, privacy: .public)': \(error)")
            return []
        }
    }
}
