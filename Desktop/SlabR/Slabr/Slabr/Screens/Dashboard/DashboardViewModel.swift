import CoreData

@MainActor
final class DashboardViewModel: ObservableObject {
    @Published var totalCards: Int = 0
    @Published var listedValue: Decimal = 0
    @Published var draftCount: Int = 0
    @Published var activeCount: Int = 0
    @Published var recentActivity: [ListingRecord] = []

    private var context: NSManagedObjectContext?
    private var userId: String = ""

    func configure(context: NSManagedObjectContext, userId: String) {
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
            let allRequest = NSFetchRequest<ListingRecord>(entityName: "ListingRecord")
            allRequest.predicate = NSPredicate(format: "userId == %@", userId)
            totalCards = try context.count(for: allRequest)

            let draftRequest = NSFetchRequest<ListingRecord>(entityName: "ListingRecord")
            draftRequest.predicate = NSPredicate(format: "userId == %@ AND status == %@", userId, RecordStatus.draft.rawValue)
            draftCount = try context.count(for: draftRequest)

            let activeRequest = NSFetchRequest<ListingRecord>(entityName: "ListingRecord")
            activeRequest.predicate = NSPredicate(format: "userId == %@ AND status == %@", userId, RecordStatus.listed.rawValue)
            activeCount = try context.count(for: activeRequest)
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
