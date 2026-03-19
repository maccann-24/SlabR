import XCTest
import CoreData
@testable import Slabr

@MainActor
final class ListingDefaultsViewModelTests: XCTestCase {

    func testLoadCreatesSettingsIfMissing() {
        let context = TestCoreDataStack.makeContext()
        let vm = ListingDefaultsViewModel(context: context, userId: "new-user")

        let request = NSFetchRequest<UserSettingsEntity>(entityName: "UserSettingsEntity")
        request.predicate = NSPredicate(format: "userId == %@", "new-user")
        let results = try? context.fetch(request)
        XCTAssertEqual(results?.count, 1)
    }

    func testSavePersistsFormat() {
        let context = TestCoreDataStack.makeContext()
        let vm = ListingDefaultsViewModel(context: context, userId: "test-user")
        vm.format = .auction
        vm.save()

        let request = NSFetchRequest<UserSettingsEntity>(entityName: "UserSettingsEntity")
        request.predicate = NSPredicate(format: "userId == %@", "test-user")
        let entity = try? context.fetch(request).first
        XCTAssertEqual(entity?.defaultFormat, "auction")
    }

    func testListingDurationLabelGTC() {
        let context = TestCoreDataStack.makeContext()
        let vm = ListingDefaultsViewModel(context: context, userId: "test-user")
        XCTAssertEqual(vm.listingDurationLabel(0), "Good 'Til Cancelled")
        XCTAssertEqual(vm.listingDurationLabel(7), "7 days")
    }
}
