import AVFoundation
import CoreImage
import os
import Vision

/// Protocol for camera hardware abstraction. Enables mock injection for ViewModel testing.
protocol CameraServiceProtocol: AnyObject {
    var onCertDetected: ((String) -> Void)? { get set }
    func startSession()
    func stopSession()
    func resumeDetection()
    func toggleTorch()
    func getPreviewLayer() -> AVCaptureVideoPreviewLayer
}

/// AVCaptureSession wrapper that delivers camera frames, runs VisionService OCR
/// throttled to ~2fps, and calls back when an 8-digit cert number is detected.
final class CameraService: NSObject, CameraServiceProtocol {
    var onCertDetected: ((String) -> Void)?

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

    override init() {
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

        // Run OCR — one task at a time, cancelled on next frame if still running
        currentOCRTask = Task { [weak self] in
            defer { self?.currentOCRTask = nil }
            do {
                if let cert = try await VisionService.extractCertNumber(from: cgImage) {
                    self?.isDetectionPaused.withLock { $0 = true }
                    DispatchQueue.main.async { [weak self] in
                        self?.onCertDetected?(cert)
                    }
                }
            } catch {
                Log.camera.error("Frame OCR failed: \(error)")
            }
        }
    }
}
