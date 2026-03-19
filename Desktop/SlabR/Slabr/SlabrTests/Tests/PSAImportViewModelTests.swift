import XCTest
@testable import Slabr

@MainActor
final class PSAImportViewModelTests: XCTestCase {

    private let testTokenKey = "psaToken"

    override func tearDown() {
        KeychainHelper.delete(key: testTokenKey)
        super.tearDown()
    }

    private func makeVM() -> PSAImportViewModel {
        let mock = MockPSAService()
        return PSAImportViewModel(
            psaService: mock,
            extractCertNumber: { _ in "12345678" }
        )
    }

    // MARK: - start()

    func testStartWithNoTokenShowsCredentials() {
        KeychainHelper.delete(key: testTokenKey)
        let vm = makeVM()
        vm.start()
        XCTAssertEqual(vm.state, .needsCredentials)
    }

    func testStartWithTokenShowsPickingImage() {
        KeychainHelper.save(key: testTokenKey, value: "fake-token")
        let vm = makeVM()
        vm.start()
        XCTAssertEqual(vm.state, .pickingImage)
    }

    // MARK: - signIn()

    func testSignInClearsCredentialsBeforeAsync() {
        let vm = makeVM()
        vm.username = "user"
        vm.password = "pass"
        vm.signIn()
        // Credentials should be cleared synchronously before the Task runs
        XCTAssertEqual(vm.username, "")
        XCTAssertEqual(vm.password, "")
    }

    // MARK: - submitManualCert()

    func testSubmitManualCertRejects7Digits() {
        let vm = makeVM()
        vm.manualCertNumber = "1234567"
        vm.submitManualCert()
        XCTAssertEqual(vm.state, .error("Enter a valid 8-digit cert number."))
    }

    func testSubmitManualCertAccepts8Digits() {
        let vm = makeVM()
        let context = TestCoreDataStack.makeContext()
        vm.configure(context: context, userId: "test")
        vm.manualCertNumber = "12345678"
        vm.submitManualCert()
        // Should transition to lookingUp (synchronous part)
        XCTAssertEqual(vm.state, .lookingUp(certNumber: "12345678"))
    }
}
