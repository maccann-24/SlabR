import AVFoundation
import UIKit
@testable import Slabr

final class MockCameraService: CameraServiceProtocol {
    var onCertDetected: (@MainActor @Sendable (String) -> Void)?
    var onCardTypeDetected: (@MainActor @Sendable (CardScanType) -> Void)?
    var startCallCount = 0
    var stopCallCount = 0
    var resumeCallCount = 0

    func startSession() {
        startCallCount += 1
    }

    func stopSession() {
        stopCallCount += 1
    }

    func resumeDetection() {
        resumeCallCount += 1
    }

    func toggleTorch() {}

    func capturePhoto() async -> UIImage? {
        nil
    }

    func getPreviewLayer() -> AVCaptureVideoPreviewLayer {
        AVCaptureVideoPreviewLayer()
    }

    // MARK: - Test Helpers

    @MainActor func simulateDetection(_ cert: String) {
        onCertDetected?(cert)
    }

    @MainActor func simulateCardTypeDetection(_ type: CardScanType) {
        onCardTypeDetected?(type)
    }
}
