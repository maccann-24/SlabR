import CoreData

@MainActor
final class AnalyticsViewModel: ObservableObject {

    struct CountItem: Identifiable {
        let label: String
        let count: Int
        var id: String { label }
    }

    struct PriceItem: Identifiable {
        let label: String
        let avgPrice: Decimal
        var id: String { label }
    }

    @Published var gradeDistribution: [CountItem] = []
    @Published var topBrands: [CountItem] = []
    @Published var priceByGrade: [PriceItem] = []
    @Published var sourceBreakdown: [CountItem] = []
    @Published var statusBreakdown: [CountItem] = []
    @Published var hasData = false

    private var context: NSManagedObjectContext?
    private var userId: String = ""
    private var allListings: [ListingRecord] = []

    func configure(context: NSManagedObjectContext, userId: String) {
        self.context = context
        self.userId = userId
    }

    func load() {
        guard let context else {
            Log.listings.fault("AnalyticsViewModel.load() called before configure()")
            return
        }

        let request = NSFetchRequest<ListingRecord>(entityName: "ListingRecord")
        request.predicate = NSPredicate(format: "userId == %@", userId)
        request.relationshipKeyPathsForPrefetching = ["card"]
        request.fetchBatchSize = 50

        do {
            allListings = try context.fetch(request)
        } catch {
            Log.listings.error("Analytics fetch failed: \(error)")
            return
        }

        hasData = !allListings.isEmpty
        guard hasData else { return }

        buildGradeDistribution()
        buildTopBrands()
        buildPriceByGrade()
        buildSourceBreakdown()
        buildStatusBreakdown()

        allListings = [] // Release memory — aggregated data is in @Published properties
    }

    // MARK: - Aggregations

    private func buildGradeDistribution() {
        let grouped = Dictionary(grouping: allListings.compactMap { $0.card?.grade }.filter { !$0.isEmpty }) { $0 }
        gradeDistribution = grouped.map { CountItem(label: "PSA \($0.key)", count: $0.value.count) }
            .sorted { $0.label > $1.label }
    }

    private func buildTopBrands() {
        let grouped = Dictionary(grouping: allListings.compactMap { $0.card?.brand }.filter { !$0.isEmpty }) { $0 }
        topBrands = grouped.map { CountItem(label: $0.key, count: $0.value.count) }
            .sorted { $0.count > $1.count }
            .prefix(5)
            .map { $0 }
    }

    private func buildPriceByGrade() {
        let withPrice: [(listing: ListingRecord, grade: String)] = allListings.compactMap { listing in
            guard listing.listingPrice != nil, let grade = listing.card?.grade, !grade.isEmpty else { return nil }
            return (listing, grade)
        }
        let grouped = Dictionary(grouping: withPrice) { $0.grade }
        priceByGrade = grouped.compactMap { grade, items in
            let prices = items.compactMap { $0.listing.listingPrice as Decimal? }
            guard !prices.isEmpty else { return nil }
            let avg = prices.reduce(0, +) / Decimal(prices.count)
            return PriceItem(label: "PSA \(grade)", avgPrice: avg)
        }
        .sorted { $0.label > $1.label }
    }

    private func buildSourceBreakdown() {
        let grouped = Dictionary(grouping: allListings) { $0.entryPoint ?? "unknown" }
        sourceBreakdown = grouped.map { source, listings in
            let label = source == "psa" ? "PSA Import" : source == "camera" ? "Camera" : source.capitalized
            return CountItem(label: label, count: listings.count)
        }
        .sorted { $0.count > $1.count }
    }

    private func buildStatusBreakdown() {
        let drafts = allListings.filter { $0.status == RecordStatus.draft.rawValue }.count
        let active = allListings.filter { $0.status == RecordStatus.listed.rawValue }.count
        statusBreakdown = [
            CountItem(label: "Active", count: active),
            CountItem(label: "Drafts", count: drafts)
        ]
    }

    // MARK: - CSV Export

    private func escapeCSVField(_ field: String) -> String {
        var escaped = field
        // Neutralize formula injection (CWE-1236)
        if let first = escaped.first, "=+-@\t\r".contains(first) {
            escaped = "'" + escaped
        }
        // RFC 4180: quote fields containing special characters, double internal quotes
        if escaped.contains("\"") || escaped.contains(",") || escaped.contains("\n") || escaped.contains("\r") {
            escaped = escaped.replacingOccurrences(of: "\"", with: "\"\"")
            escaped = "\"\(escaped)\""
        }
        return escaped
    }

    func exportCSV() -> URL? {
        guard let context else { return nil }

        let request = NSFetchRequest<ListingRecord>(entityName: "ListingRecord")
        request.predicate = NSPredicate(format: "userId == %@", userId)
        request.relationshipKeyPathsForPrefetching = ["card"]
        request.fetchBatchSize = 50

        let listings: [ListingRecord]
        do {
            listings = try context.fetch(request)
        } catch {
            Log.listings.error("CSV export fetch failed: \(error)")
            return nil
        }

        let dateFormatter = AccessControl.iso8601Formatter
        var rows = ["Date,Player,Year,Brand,Set,Grade,Cert,Price,Status,Source"]

        for listing in listings {
            let card = listing.card
            let date = listing.date.map { dateFormatter.string(from: $0) } ?? ""
            let player = card?.playerName ?? ""
            let year = card.map { $0.year > 0 ? "\($0.year)" : "" } ?? ""
            let brand = card?.brand ?? ""
            let setName = card?.setName ?? ""
            let grade = card?.grade ?? ""
            let cert = card?.certNumber ?? ""
            let price = (listing.listingPrice as Decimal?).map { "\($0)" } ?? ""
            let status = listing.status ?? ""
            let source = listing.entryPoint ?? ""

            rows.append([date, player, year, brand, setName, grade, cert, price, status, source]
                .map { escapeCSVField($0) }
                .joined(separator: ","))
        }

        let csv = rows.joined(separator: "\n") + "\n"

        let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent("slabr-listings.csv")
        do {
            try csv.write(to: tempURL, atomically: true, encoding: .utf8)
            return tempURL
        } catch {
            Log.listings.error("CSV export failed: \(error)")
            return nil
        }
    }
}
