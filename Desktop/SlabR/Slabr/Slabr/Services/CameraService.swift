import AVFoundation
import CoreImage
import os
import UIKit
import Vision

/// Protocol for camera hardware abstraction. Enables mock injection for ViewModel testing.
protocol CameraServiceProtocol: AnyObject {
    var onCertDetected: (@MainActor @Sendable (String) -> Void)? { get set }
    var onCardTypeDetected: (@MainActor @Sendable (CardScanType) -> Void)? { get set }
    func startSession()
    func stopSession()
    func resumeDetection()
    func toggleTorch()
    func capturePhoto() async -> UIImage?
    func getPreviewLayer() -> AVCaptureVideoPreviewLayer
}

/// AVCaptureSession wrapper that delivers camera frames, runs VisionService OCR
/// throttled to ~2fps, and calls back when an 8-digit cert number is detected.
/// Also performs card type detection (PSA slab vs raw card) via color heuristic.
final class CameraService: NSObject, CameraServiceProtocol {
    var onCertDetected: (@MainActor @Sendable (String) -> Void)?
    var onCardTypeDetected: (@MainActor @Sendable (CardScanType) -> Void)?

    private let session = AVCaptureSession()
    private let videoOutput = AVCaptureVideoDataOutput()
    private let ocrQueue = DispatchQueue(label: "com.slabr.cameraOCR", qos: .userInitiated)
    private let sessionQueue = DispatchQueue(label: "com.slabr.cameraSession")
    private let ciContext = CIContext()
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var lastProcessedTime: CFAbsoluteTime = 0
    private let isDetectionPaused = OSAllocatedUnfairLock(initialState: false)
    private var currentOCRTask: Task<Void, Never>?
    private var device: AVCaptureDevice?
    private let detectionService: CardDetectionServiceProtocol
    private let photoOutput = AVCapturePhotoOutput()
    private struct CardDetectionState {
        var votes: [CardScanType: Int] = [:]
        var resolved = false
        var frameCount = 0
    }

    private let photoLock = OSAllocatedUnfairLock<CheckedContinuation<UIImage?, Never>?>(initialState: nil)
    private let detectionState = OSAllocatedUnfairLock(initialState: CardDetectionState())

    init(detectionService: CardDetectionServiceProtocol = CardDetectionService()) {
        self.detectionService = detectionService
        super.init()
        configureSession()
    }

    // MARK: - Configuration

    private func configureSession() {
        session.beginConfiguration()
        session.sessionPreset = .hd1280x720

        // Camera input
        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) else {
            Log.camera.error("No back camera available")
            session.commitConfiguration()
            return
        }
        device = camera

        do {
            let input = try AVCaptureDeviceInput(device: camera)
            if session.canAddInput(input) {
                session.addInput(input)
            }
        } catch {
            Log.camera.error("Failed to create camera input: \(error)")
            session.commitConfiguration()
            return
        }

        // Configure camera for close-up scanning
        do {
            try camera.lockForConfiguration()
            if camera.isFocusModeSupported(.continuousAutoFocus) {
                camera.focusMode = .continuousAutoFocus
            }
            if camera.isExposureModeSupported(.continuousAutoExposure) {
                camera.exposureMode = .continuousAutoExposure
            }
            camera.unlockForConfiguration()
        } catch {
            Log.camera.error("Failed to configure camera: \(error)")
        }

        // Video output for frame processing
        videoOutput.setSampleBufferDelegate(self, queue: ocrQueue)
        videoOutput.alwaysDiscardsLateVideoFrames = true
        if session.canAddOutput(videoOutput) {
            session.addOutput(videoOutput)
        }

        // Photo output for raw card capture
        if session.canAddOutput(photoOutput) {
            session.addOutput(photoOutput)
        }

        // Portrait orientation
        if let connection = videoOutput.connection(with: .video) {
            if #available(iOS 17.0, *) {
                connection.videoRotationAngle = 90
            } else {
                connection.videoOrientation = .portrait
            }
        }

        session.commitConfiguration()

        previewLayer = AVCaptureVideoPreviewLayer(session: session)
    }

    // MARK: - CameraServiceProtocol

    func startSession() {
        sessionQueue.async { [weak self] in
            self?.session.startRunning()
        }
    }

    func stopSession() {
        sessionQueue.async { [weak self] in
            self?.session.stopRunning()
        }
    }

    func resumeDetection() {
        isDetectionPaused.withLock { $0 = false }
        detectionState.withLock { state in
            state.resolved = false
            state.votes = [:]
            state.frameCount = 0
        }
    }

    func capturePhoto() async -> UIImage? {
        await withCheckedContinuation { continuation in
            photoLock.withLock { $0 = continuation }
            let settings = AVCapturePhotoSettings()
            self.photoOutput.capturePhoto(with: settings, delegate: self)
        }
    }

    func toggleTorch() {
        guard let device, device.hasTorch else { return }
        do {
            try device.lockForConfiguration()
            device.torchMode = device.torchMode == .on ? .off : .on
            device.unlockForConfiguration()
        } catch {
            Log.camera.error("Failed to toggle torch: \(error)")
        }
    }

    func getPreviewLayer() -> AVCaptureVideoPreviewLayer {
        previewLayer ?? AVCaptureVideoPreviewLayer(session: session)
    }
}

// MARK: - Frame Processing

extension CameraService: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        guard isDetectionPaused.withLock({ !$0 }) else { return }

        // Throttle to ~2fps
        let now = CFAbsoluteTimeGetCurrent()
        guard now - lastProcessedTime >= 0.5 else { return }
        lastProcessedTime = now

        // Skip if a previous OCR task is still running
        guard currentOCRTask == nil else { return }

        // Convert CMSampleBuffer → CGImage
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
        guard let cgImage = ciContext.createCGImage(ciImage, from: ciImage.extent) else { return }

        // Phase 1: Card type detection (first ~10 frames)
        let isResolved = detectionState.withLock { $0.resolved }
        if !isResolved {
            let vote = detectionService.detectCardType(from: cgImage)

            let resolvedType: CardScanType? = detectionState.withLock { state in
                guard !state.resolved else { return nil }
                state.frameCount += 1
                state.votes[vote, default: 0] += 1

                // After 10 frames (~5s at 2fps), resolve by majority vote
                if state.frameCount >= 10 {
                    let winner = state.votes.max(by: { $0.value < $1.value })?.key ?? .unknown
                    state.resolved = true
                    return winner
                } else if let (type, count) = state.votes.max(by: { $0.value < $1.value }), count >= 5 {
                    // Early resolution if 5+ consistent votes
                    state.resolved = true
                    return type
                }
                return nil
            }

            if let resolved = resolvedType {
                Task { @MainActor [weak self] in
                    self?.onCardTypeDetected?(resolved)
                }
            }
            return // Skip OCR during detection phase
        }

        // Phase 2: OCR (only runs after card type resolved, for PSA slab flow)
        currentOCRTask = Task { [weak self] in
            defer { self?.currentOCRTask = nil }
            do {
                if let cert = try await VisionService.extractCertNumber(from: cgImage) {
                    self?.isDetectionPaused.withLock { $0 = true }
                    Task { @MainActor [weak self] in
                        self?.onCertDetected?(cert)
                    }
                }
            } catch {
                Log.camera.error("Frame OCR failed: \(error)")
            }
        }
    }
}

// MARK: - Photo Capture

extension CameraService: AVCapturePhotoCaptureDelegate {
    private func resumePhotoContinuation(with image: UIImage?) {
        photoLock.withLock { cont in
            cont?.resume(returning: image)
            cont = nil
        }
    }

    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        if let error {
            Log.camera.error("Photo capture failed: \(error)")
            resumePhotoContinuation(with: nil)
            return
        }
        guard let data = photo.fileDataRepresentation(),
              let image = UIImage(data: data) else {
            resumePhotoContinuation(with: nil)
            return
        }
        resumePhotoContinuation(with: image)
    }
}
