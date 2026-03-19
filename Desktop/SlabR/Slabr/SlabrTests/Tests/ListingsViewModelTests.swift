import XCTest
import CoreData
@testable import Slabr

@MainActor
final class ListingsViewModelTests: XCTestCase {

    func testUnconfiguredViewModelReturnsEmpty() {
        let vm = ListingsViewModel()
        vm.load()
        XCTAssertTrue(vm.drafts.isEmpty)
        XCTAssertTrue(vm.listed.isEmpty)
    }

    func testLoadReturnsDrafts() {
        let context = TestCoreDataStack.makeContext()
        _ = TestCoreDataStack.makeListingRecord(context: context, status: RecordStatus.draft.rawValue, userId: "u1")
        try? context.save()

        let vm = ListingsViewModel()
        vm.configure(context: context, userId: "u1")
        vm.load()
        XCTAssertEqual(vm.drafts.count, 1)
        XCTAssertTrue(vm.listed.isEmpty)
    }

    func testLoadReturnsListed() {
        let context = TestCoreDataStack.makeContext()
        _ = TestCoreDataStack.makeListingRecord(context: context, status: RecordStatus.listed.rawValue, userId: "u1")
        try? context.save()

        let vm = ListingsViewModel()
        vm.configure(context: context, userId: "u1")
        vm.load()
        XCTAssertTrue(vm.drafts.isEmpty)
        XCTAssertEqual(vm.listed.count, 1)
    }

    func testFetchRecordsFiltersByUserId() {
        let context = TestCoreDataStack.makeContext()
        _ = TestCoreDataStack.makeListingRecord(context: context, userId: "user-A")
        _ = TestCoreDataStack.makeListingRecord(context: context, userId: "user-B")
        try? context.save()

        let vm = ListingsViewModel()
        vm.configure(context: context, userId: "user-A")
        vm.load()
        XCTAssertEqual(vm.drafts.count, 1)
    }
}
