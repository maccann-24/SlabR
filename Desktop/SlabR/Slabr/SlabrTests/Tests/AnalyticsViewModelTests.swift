import XCTest
import CoreData
@testable import Slabr

@MainActor
final class AnalyticsViewModelTests: XCTestCase {

    private func makeVM(with listings: [(grade: String?, brand: String, price: Decimal?, status: String, entryPoint: String)] = []) -> AnalyticsViewModel {
        let context = TestCoreDataStack.makeContext()
        for item in listings {
            let listing = TestCoreDataStack.makeListingRecord(
                context: context,
                brand: item.brand,
                grade: item.grade,
                price: item.price,
                status: item.status,
                userId: "test-user"
            )
            listing.entryPoint = item.entryPoint
        }
        try? context.save()

        let vm = AnalyticsViewModel()
        vm.configure(context: context, userId: "test-user")
        vm.load()
        return vm
    }

    func testGradeDistributionGroupsCorrectly() {
        let vm = makeVM(with: [
            (grade: "10", brand: "Topps", price: nil, status: "draft", entryPoint: "psa"),
            (grade: "10", brand: "Topps", price: nil, status: "draft", entryPoint: "psa"),
            (grade: "9", brand: "Panini", price: nil, status: "draft", entryPoint: "psa"),
        ])
        let psa10 = vm.gradeDistribution.first(where: { $0.label == "PSA 10" })
        let psa9 = vm.gradeDistribution.first(where: { $0.label == "PSA 9" })
        XCTAssertEqual(psa10?.count, 2)
        XCTAssertEqual(psa9?.count, 1)
    }

    func testTopBrandsReturnsSortedByCount() {
        let vm = makeVM(with: [
            (grade: "10", brand: "Topps", price: nil, status: "draft", entryPoint: "psa"),
            (grade: "10", brand: "Topps", price: nil, status: "draft", entryPoint: "psa"),
            (grade: "10", brand: "Panini", price: nil, status: "draft", entryPoint: "psa"),
        ])
        XCTAssertEqual(vm.topBrands.first?.label, "Topps")
        XCTAssertEqual(vm.topBrands.first?.count, 2)
    }

    func testPriceByGradeComputesAverages() {
        let vm = makeVM(with: [
            (grade: "10", brand: "Topps", price: 100, status: "listed", entryPoint: "psa"),
            (grade: "10", brand: "Topps", price: 200, status: "listed", entryPoint: "psa"),
        ])
        let psa10 = vm.priceByGrade.first(where: { $0.label == "PSA 10" })
        XCTAssertEqual(psa10?.avgPrice, 150)
    }

    func testSourceBreakdownCountsCorrectly() {
        let vm = makeVM(with: [
            (grade: "10", brand: "Topps", price: nil, status: "draft", entryPoint: "psa"),
            (grade: "10", brand: "Topps", price: nil, status: "draft", entryPoint: "psa"),
            (grade: "10", brand: "Topps", price: nil, status: "draft", entryPoint: "camera"),
        ])
        let psa = vm.sourceBreakdown.first(where: { $0.label == "PSA Import" })
        let camera = vm.sourceBreakdown.first(where: { $0.label == "Camera" })
        XCTAssertEqual(psa?.count, 2)
        XCTAssertEqual(camera?.count, 1)
    }

    func testStatusBreakdownCountsCorrectly() {
        let vm = makeVM(with: [
            (grade: "10", brand: "Topps", price: 50, status: RecordStatus.draft.rawValue, entryPoint: "psa"),
            (grade: "10", brand: "Topps", price: 50, status: RecordStatus.listed.rawValue, entryPoint: "psa"),
            (grade: "10", brand: "Topps", price: 50, status: RecordStatus.listed.rawValue, entryPoint: "psa"),
        ])
        let active = vm.statusBreakdown.first(where: { $0.label == "Active" })
        let drafts = vm.statusBreakdown.first(where: { $0.label == "Drafts" })
        XCTAssertEqual(active?.count, 2)
        XCTAssertEqual(drafts?.count, 1)
    }

    func testCSVExportProducesFile() {
        let vm = makeVM(with: [
            (grade: "10", brand: "Topps", price: 29.99, status: "listed", entryPoint: "psa"),
        ])
        let url = vm.exportCSV()
        XCTAssertNotNil(url)
        if let url {
            let content = try? String(contentsOf: url)
            XCTAssertTrue(content?.contains("Topps") ?? false)
            XCTAssertTrue(content?.contains("Date,Player") ?? false)
        }
    }
}
