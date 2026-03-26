import XCTest
@testable import Slabr

@MainActor
final class ListingBuilderViewModelTests: XCTestCase {

    private var context = TestCoreDataStack.makeContext()
    private let mockEbay = MockEbayService()

    private func makeVM(price: String = "", title: String? = nil) -> ListingBuilderViewModel {
        let record = TestCoreDataStack.makeListingRecord(context: context, title: title)
        let vm = ListingBuilderViewModel(listing: record, ebayService: mockEbay)
        vm.priceText = price
        return vm
    }

    // MARK: - Price Validation

    func testValidatePriceEmpty() {
        let vm = makeVM(price: "")
        XCTAssertEqual(vm.validatePrice(), "Enter a price.")
    }

    func testValidatePriceNonNumeric() {
        let vm = makeVM(price: "abc")
        XCTAssertEqual(vm.validatePrice(), "Enter a valid number.")
    }

    func testValidatePriceZero() {
        let vm = makeVM(price: "0")
        XCTAssertEqual(vm.validatePrice(), "Price must be greater than $0.00.")
    }

    func testValidatePriceNegative() {
        let vm = makeVM(price: "-5")
        XCTAssertEqual(vm.validatePrice(), "Price must be greater than $0.00.")
    }

    func testValidatePriceTooHigh() {
        let vm = makeVM(price: "100000")
        XCTAssertEqual(vm.validatePrice(), "Price cannot exceed $99,999.99.")
    }

    func testValidatePriceTooManyDecimals() {
        let vm = makeVM(price: "9.999")
        XCTAssertEqual(vm.validatePrice(), "Price can have at most 2 decimal places.")
    }

    func testValidatePriceValid() {
        let vm = makeVM(price: "49.99")
        XCTAssertNil(vm.validatePrice())
    }

    func testValidatePriceMaxBoundary() {
        let vm = makeVM(price: "99999.99")
        XCTAssertNil(vm.validatePrice())
    }

    // MARK: - canPublish

    func testCanPublishRequiresPriceAndTitle() {
        let vm = makeVM(price: "19.99")
        vm.title = "Valid Title"
        XCTAssertTrue(vm.canPublish)
    }

    func testCanPublishRejectsTitleOver80Chars() {
        let vm = makeVM(price: "19.99")
        vm.title = String(repeating: "A", count: 81)
        XCTAssertFalse(vm.canPublish)
    }

    // MARK: - Publish

    func testPublishCallsEbayService() {
        let vm = makeVM(price: "29.99", title: "Test Card")
        vm.title = "Test Card"
        vm.publish()

        let expectation = XCTestExpectation(description: "Publish completes")
        Task {
            // Yield to let the internal Task in publish() complete
            try? await Task.sleep(nanoseconds: 100_000_000)
            XCTAssertNotNil(self.mockEbay.lastPublishRequest)
            expectation.fulfill()
        }
        wait(for: [expectation], timeout: 2.0)
    }

    func testPublishSetsPublishingState() {
        let vm = makeVM(price: "29.99", title: "Test Card")
        vm.title = "Test Card"
        vm.publish()

        // publish() synchronously sets state to .publishing before spawning the async Task
        XCTAssertEqual(vm.state, .publishing)
    }

    // MARK: - Save Draft

    func testSaveDraftWritesFormToListing() {
        let record = TestCoreDataStack.makeListingRecord(context: context)
        let vm = ListingBuilderViewModel(listing: record, ebayService: mockEbay)
        vm.title = "Updated Draft Title"
        vm.priceText = "39.99"
        vm.saveDraft()

        // saveDraft calls writeFormToListing which writes title and price to the record
        XCTAssertEqual(record.listingTitle, "Updated Draft Title")
        XCTAssertEqual(record.listingPrice as? Decimal, Decimal(string: "39.99"))
    }
}
