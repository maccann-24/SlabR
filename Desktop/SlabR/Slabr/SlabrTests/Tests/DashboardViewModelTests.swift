import XCTest
import CoreData
@testable import Slabr

@MainActor
final class DashboardViewModelTests: XCTestCase {

    func testEmptyDataReturnsZeros() {
        let context = TestCoreDataStack.makeContext()
        let vm = DashboardViewModel()
        vm.configure(context: context, userId: "test-user")
        vm.load()
        XCTAssertEqual(vm.totalCards, 0)
        XCTAssertEqual(vm.draftCount, 0)
        XCTAssertEqual(vm.activeCount, 0)
        XCTAssertEqual(vm.listedValue, 0)
        XCTAssertTrue(vm.recentActivity.isEmpty)
    }

    func testLoadCountsDraftsCorrectly() {
        let context = TestCoreDataStack.makeContext()
        _ = TestCoreDataStack.makeListingRecord(context: context, status: RecordStatus.draft.rawValue, userId: "u1")
        _ = TestCoreDataStack.makeListingRecord(context: context, status: RecordStatus.draft.rawValue, userId: "u1")
        try? context.save()

        let vm = DashboardViewModel()
        vm.configure(context: context, userId: "u1")
        vm.load()
        XCTAssertEqual(vm.totalCards, 2)
        XCTAssertEqual(vm.draftCount, 2)
        XCTAssertEqual(vm.activeCount, 0)
    }

    func testLoadCountsActiveCorrectly() {
        let context = TestCoreDataStack.makeContext()
        _ = TestCoreDataStack.makeListingRecord(context: context, status: RecordStatus.listed.rawValue, userId: "u1")
        try? context.save()

        let vm = DashboardViewModel()
        vm.configure(context: context, userId: "u1")
        vm.load()
        XCTAssertEqual(vm.activeCount, 1)
    }

    func testListedValueSumsPrices() {
        let context = TestCoreDataStack.makeContext()
        _ = TestCoreDataStack.makeListingRecord(context: context, price: 29.99, status: RecordStatus.listed.rawValue, userId: "u1")
        _ = TestCoreDataStack.makeListingRecord(context: context, price: 49.99, status: RecordStatus.listed.rawValue, userId: "u1")
        try? context.save()

        let vm = DashboardViewModel()
        vm.configure(context: context, userId: "u1")
        vm.load()
        XCTAssertEqual(vm.listedValue, Decimal(string: "79.98"))
    }

    func testRecentActivityLimitedTo5() {
        let context = TestCoreDataStack.makeContext()
        for _ in 0..<8 {
            _ = TestCoreDataStack.makeListingRecord(context: context, userId: "u1")
        }
        try? context.save()

        let vm = DashboardViewModel()
        vm.configure(context: context, userId: "u1")
        vm.load()
        XCTAssertEqual(vm.recentActivity.count, 5)
    }
}
