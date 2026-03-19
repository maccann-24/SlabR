import AVFoundation
@testable import Slabr

final class MockCameraService: CameraServiceProtocol {
    var onCertDetected: ((String) -> Void)?
    var onCardTypeDetected: ((CardScanType) -> Void)?
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

    func simulateDetection(_ cert: String) {
        onCertDetected?(cert)
    }

    func simulateCardTypeDetection(_ type: CardScanType) {
        onCardTypeDetected?(type)
    }
}
