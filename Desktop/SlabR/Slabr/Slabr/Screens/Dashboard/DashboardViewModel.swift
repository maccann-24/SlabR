import CoreData

@MainActor
final class DashboardViewModel: ObservableObject {
    @Published var totalCards: Int = 0
    @Published var listedValue: Decimal = 0
    @Published var draftCount: Int = 0
    @Published var activeCount: Int = 0
    @Published var gradedCount: Int = 0
    @Published var recentActivity: [ListingRecord] = []

    private var context: NSManagedObjectContext?
    private var userId: String = ""

    var isConfigured: Bool { context != nil }

    func configure(context: NSManagedObjectContext, userId: String) {
        guard self.context == nil else { return }
        self.context = context
        self.userId = userId
    }

    func load() {
        guard let context else {
            Log.listings.fault("DashboardViewModel.load() called before configure()")
            return
        }

        loadCounts(context: context)
        loadListedValue(context: context)
        loadRecentActivity(context: context)
    }

    // MARK: - Private

    private func loadCounts(context: NSManagedObjectContext) {
        do {
            let request = NSFetchRequest<ListingRecord>(entityName: "ListingRecord")
            request.predicate = NSPredicate(format: "userId == %@", userId)
            request.relationshipKeyPathsForPrefetching = ["card"]
            let all = try context.fetch(request)
            totalCards = all.count
            draftCount = all.filter { $0.status == RecordStatus.draft.rawValue }.count
            activeCount = all.filter { $0.status == RecordStatus.listed.rawValue }.count
            gradedCount = all.filter { ($0.card?.grade ?? "").isEmpty == false }.count
        } catch {
            Log.listings.error("Dashboard count fetch failed: \(error)")
        }
    }

    private func loadListedValue(context: NSManagedObjectContext) {
        let request = NSFetchRequest<NSFetchRequestResult>(entityName: "ListingRecord")
        request.predicate = NSPredicate(format: "userId == %@ AND status == %@ AND listingPrice != nil", userId, RecordStatus.listed.rawValue)
        request.resultType = .dictionaryResultType

        let sumExpr = NSExpressionDescription()
        sumExpr.name = "totalPrice"
        sumExpr.expression = NSExpression(forFunction: "sum:", arguments: [NSExpression(forKeyPath: "listingPrice")])
        sumExpr.expressionResultType = .decimalAttributeType
        request.propertiesToFetch = [sumExpr]

        do {
            let results = try context.fetch(request)
            listedValue = (results.first as? NSDictionary)?["totalPrice"] as? Decimal ?? 0
        } catch {
            Log.listings.error("Dashboard value fetch failed: \(error)")
        }
    }

    private func loadRecentActivity(context: NSManagedObjectContext) {
        let request = NSFetchRequest<ListingRecord>(entityName: "ListingRecord")
        request.predicate = NSPredicate(format: "userId == %@", userId)
        request.sortDescriptors = [NSSortDescriptor(key: "date", ascending: false)]
        request.fetchLimit = 5
        request.fetchBatchSize = 5
        request.relationshipKeyPathsForPrefetching = ["card"]

        do {
            recentActivity = try context.fetch(request)
        } catch {
            Log.listings.error("Dashboard recent activity fetch failed: \(error)")
        }
    }

    // MARK: - Formatting

    private static let currencyFormatter: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencyCode = "USD"
        f.maximumFractionDigits = 0
        return f
    }()

    var formattedListedValue: String {
        Self.currencyFormatter.string(from: listedValue as NSDecimalNumber) ?? "$0"
    }
}
