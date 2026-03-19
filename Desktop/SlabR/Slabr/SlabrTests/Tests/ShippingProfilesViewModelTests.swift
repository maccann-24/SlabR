import XCTest
import CoreData
@testable import Slabr

@MainActor
final class ShippingProfilesViewModelTests: XCTestCase {

    private func makeVM() -> ShippingProfilesViewModel {
        let context = TestCoreDataStack.makeContext()
        return ShippingProfilesViewModel(context: context, userId: "test-user")
    }

    func testFetchProfilesReturnsEmpty() {
        let vm = makeVM()
        XCTAssertTrue(vm.profiles.isEmpty)
    }

    func testCreateAndFetchProfile() {
        let vm = makeVM()
        vm.formName = "Standard"
        vm.formService = "USPS"
        vm.formHandlingDays = 2
        vm.saveProfile()
        XCTAssertEqual(vm.profiles.count, 1)
        XCTAssertEqual(vm.profiles.first?.name, "Standard")
    }

    func testDeleteProfile() {
        let vm = makeVM()
        vm.formName = "ToDelete"
        vm.saveProfile()
        guard let profile = vm.profiles.first else {
            XCTFail("Expected a profile")
            return
        }
        vm.deleteProfile(profile)
        XCTAssertTrue(vm.profiles.isEmpty)
    }

    func testSetDefaultClearsOthers() {
        let vm = makeVM()
        vm.formName = "First"
        vm.formIsDefault = true
        vm.saveProfile()
        vm.resetForm()
        vm.formName = "Second"
        vm.formIsDefault = true
        vm.saveProfile()

        let first = vm.profiles.first(where: { $0.name == "First" })
        let second = vm.profiles.first(where: { $0.name == "Second" })
        XCTAssertEqual(first?.isDefault, false)
        XCTAssertEqual(second?.isDefault, true)
    }

    func testResetFormClearsFields() {
        let vm = makeVM()
        vm.formName = "Test"
        vm.formService = "FedEx"
        vm.resetForm()
        XCTAssertEqual(vm.formName, "")
        XCTAssertEqual(vm.formService, "USPS")
    }

    func testFirstProfileIsDefault() {
        let vm = makeVM()
        vm.formName = "OnlyOne"
        vm.formIsDefault = false
        vm.saveProfile()
        // First profile should be default even if formIsDefault was false
        XCTAssertEqual(vm.profiles.first?.isDefault, true)
    }
}
