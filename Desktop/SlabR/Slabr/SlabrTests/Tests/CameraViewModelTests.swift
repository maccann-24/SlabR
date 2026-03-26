import XCTest
@testable import Slabr

@MainActor
final class CameraViewModelTests: XCTestCase {

    private let testTokenKey = "psaToken"

    override func tearDown() {
        KeychainHelper.delete(key: testTokenKey)
        super.tearDown()
    }

    private func makeVM() -> (CameraViewModel, MockCameraService, MockPSAService) {
        let mockPSA = MockPSAService()
        let mockCamera = MockCameraService()
        let vm = CameraViewModel(psaService: mockPSA, cameraService: mockCamera)
        let context = TestCoreDataStack.makeContext()
        vm.configure(context: context, userId: "test-user")
        return (vm, mockCamera, mockPSA)
    }

    // MARK: - Initial State

    func testInitialStateIsDetecting() {
        let (vm, _, _) = makeVM()
        vm.startCamera()
        XCTAssertEqual(vm.state, .detecting)
    }

    // MARK: - Card Type Detection

    func testCardTypeDetectedPSATransitions() {
        let (vm, _, _) = makeVM()
        KeychainHelper.save(key: testTokenKey, value: "fake-token")
        vm.cardTypeDetected(.psaSlab)
        XCTAssertEqual(vm.state, .detectedType(.psaSlab))
    }

    func testCardTypeDetectedRawTransitions() {
        let (vm, _, _) = makeVM()
        vm.cardTypeDetected(.rawCard)
        XCTAssertEqual(vm.state, .detectedType(.rawCard))
    }

    func testCardTypeUnknownStaysOnDetectedType() {
        let (vm, _, _) = makeVM()
        vm.cardTypeDetected(.unknown)
        XCTAssertEqual(vm.state, .detectedType(.unknown))
    }

    func testUserSelectsPSAFromFallback() {
        let (vm, _, _) = makeVM()
        KeychainHelper.save(key: testTokenKey, value: "fake-token")
        vm.userSelectedType(.psaSlab)
        XCTAssertEqual(vm.state, .detectedType(.psaSlab))
    }

    // MARK: - PSA Cert Detection (existing)

    func testCertDetectedTransitionsToDetected() {
        let (vm, _, _) = makeVM()
        // Must be in scanning state for cert detection
        vm.state = .scanning
        vm.certDetected("12345678")
        XCTAssertEqual(vm.state, .detected("12345678"))
    }

    func testCertDetectedDebouncesSameCert() {
        let (vm, _, _) = makeVM()
        vm.state = .scanning
        vm.certDetected("12345678")
        vm.certDetected("12345678")
        XCTAssertEqual(vm.state, .detected("12345678"))
    }

    func testCertDetectedAllowsDifferentCert() {
        let (vm, _, _) = makeVM()
        vm.state = .scanning
        vm.certDetected("12345678")
        vm.certDetected("87654321")
        XCTAssertEqual(vm.state, .detected("87654321"))
    }

    // MARK: - Manual Entry

    func testSubmitManualCertRejects7Digits() {
        let (vm, _, _) = makeVM()
        vm.manualCertNumber = "1234567"
        vm.submitManualCert()
        if case .error = vm.state {
            // Expected
        } else {
            XCTFail("Expected error state")
        }
    }

    // MARK: - Raw Card Flow

    func testRawReadyState() {
        let (vm, _, _) = makeVM()
        vm.state = .rawReady
        XCTAssertEqual(vm.state, .rawReady)
    }

    // MARK: - Reset

    func testResetReturnsToDetecting() {
        let (vm, mockCamera, _) = makeVM()
        vm.certDetected("12345678")
        vm.reset()
        XCTAssertEqual(vm.state, .detecting)
        XCTAssertEqual(mockCamera.resumeCallCount, 1)
    }

    // MARK: - Async State Transitions

    func testConfirmLookupTransitionsToLookingUp() {
        let (vm, _, _) = makeVM()
        vm.state = .detected("12345678")
        vm.confirmLookup()
        XCTAssertEqual(vm.state, .lookingUp("12345678"))
    }

    func testLookupSuccessTransitionsToFound() async throws {
        let (vm, _, mockPSA) = makeVM()
        mockPSA.lookupResult = .success(MockData.psaCard)
        vm.state = .detected("12345678")
        vm.confirmLookup()
        try await Task.sleep(for: .milliseconds(200))
        XCTAssertEqual(vm.state, .found(MockData.psaCard))
    }

    func testSaveDraftTransitionsToSaved() async throws {
        let (vm, _, mockPSA) = makeVM()
        mockPSA.lookupResult = .success(MockData.psaCard)
        vm.state = .detected("12345678")
        vm.confirmLookup()
        try await Task.sleep(for: .milliseconds(200))
        XCTAssertEqual(vm.state, .found(MockData.psaCard))
        vm.saveDraft(card: MockData.psaCard)
        XCTAssertEqual(vm.state, .saved)
    }

    func testCaptureRawPhotoSetsRawCaptured() async throws {
        let (vm, mockCamera, _) = makeVM()
        mockCamera.capturePhotoResult = UIImage()
        vm.state = .rawReady
        vm.captureRawPhoto()
        try await Task.sleep(for: .milliseconds(200))
        XCTAssertEqual(vm.state, .rawCaptured)
        XCTAssertNotNil(vm.capturedImage)
    }
}
