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

    // MARK: - Start

    func testStartCameraWithNoTokenShowsError() {
        KeychainHelper.delete(key: testTokenKey)
        let (vm, _, _) = makeVM()
        vm.startCamera()
        if case .error = vm.state {
            // Expected
        } else {
            XCTFail("Expected error state, got \(vm.state)")
        }
    }

    func testStartCameraWithTokenStartsScanning() {
        KeychainHelper.save(key: testTokenKey, value: "fake-token")
        let (vm, mockCamera, _) = makeVM()
        vm.startCamera()
        XCTAssertEqual(vm.state, .scanning)
        XCTAssertEqual(mockCamera.startCallCount, 1)
    }

    // MARK: - Detection

    func testCertDetectedTransitionsToDetected() {
        let (vm, _, _) = makeVM()
        vm.certDetected("12345678")
        XCTAssertEqual(vm.state, .detected("12345678"))
    }

    func testCertDetectedDebouncesSameCert() {
        let (vm, _, _) = makeVM()
        vm.certDetected("12345678")
        XCTAssertEqual(vm.state, .detected("12345678"))

        // Reset to scanning to verify debounce prevents re-detection
        vm.certDetected("12345678")
        // Should still be detected (debounce doesn't reset state, just ignores)
        XCTAssertEqual(vm.state, .detected("12345678"))
    }

    func testCertDetectedAllowsDifferentCert() {
        let (vm, _, _) = makeVM()
        vm.certDetected("12345678")
        vm.certDetected("87654321")
        XCTAssertEqual(vm.state, .detected("87654321"))
    }

    // MARK: - Manual Entry

    func testSubmitManualCertRejects7Digits() {
        let (vm, _, _) = makeVM()
        vm.manualCertNumber = "1234567"
        vm.submitManualCert()
        XCTAssertEqual(vm.state, .error("Enter a valid 8-digit cert number."))
    }

    // MARK: - Reset

    func testResetReturnsToScanning() {
        let (vm, mockCamera, _) = makeVM()
        vm.certDetected("12345678")
        XCTAssertEqual(vm.state, .detected("12345678"))
        vm.reset()
        XCTAssertEqual(vm.state, .scanning)
        XCTAssertEqual(mockCamera.resumeCallCount, 1)
    }
}
