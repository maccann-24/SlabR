import SwiftUI
import CoreData

/// Manages the live camera OCR flow — an 8-state machine:
/// `scanning → detected(cert) → lookingUp(cert) → found(PSACard) → saved`
/// with fallback paths to `notFound`, `error`, and `manualEntry`.
///
/// Dependencies injected for testability: `psaService` (PSA API), `cameraService` (AVCaptureSession).
@MainActor
final class CameraViewModel: ObservableObject {

    enum CameraState: Equatable {
        case scanning
        case detected(String)
        case lookingUp(String)
        case found(PSACard)
        case notFound(String)
        case error(String)
        case manualEntry
        case saved
    }

    @Published var state: CameraState = .scanning
    @Published var manualCertNumber: String = ""
    @Published private(set) var savedRecord: ListingRecord?

    private let psaService: PSAServiceProtocol
    private(set) var cameraService: CameraServiceProtocol
    private var context: NSManagedObjectContext?
    private var userId: String = ""

    // Debounce: ignore same cert within 3 seconds
    private var lastDetectedCert: String?
    private var lastDetectionTime: Date = .distantPast

    init(
        psaService: PSAServiceProtocol = PSAService.shared,
        cameraService: CameraServiceProtocol = CameraService()
    ) {
        self.psaService = psaService
        self.cameraService = cameraService
    }

    /// Injects the managed object context and userId. Must be called from `onAppear`.
    func configure(context: NSManagedObjectContext, userId: String) {
        self.context = context
        self.userId = userId
    }

    // MARK: - Camera Lifecycle

    func startCamera() {
        guard KeychainHelper.read(key: "psaToken") != nil else {
            state = .error("Sign in to your PSA account first (Settings → PSA account).")
            return
        }
        cameraService.onCertDetected = { [weak self] cert in
            self?.certDetected(cert)
        }
        cameraService.startSession()
        state = .scanning
    }

    func stopCamera() {
        cameraService.stopSession()
    }

    // MARK: - Detection

    /// Called from CameraService when OCR finds an 8-digit cert number.
    /// Debounces same cert within 3 seconds to prevent rapid-fire detections.
    func certDetected(_ cert: String) {
        let now = Date()
        if cert == lastDetectedCert, now.timeIntervalSince(lastDetectionTime) < 3 {
            return
        }
        lastDetectedCert = cert
        lastDetectionTime = now
        state = .detected(cert)
        HapticManager.shared.certFound()
    }

    /// User confirms the detected cert number for lookup.
    func confirmLookup() {
        guard case .detected(let cert) = state else { return }
        lookupCert(cert)
    }

    // MARK: - Lookup

    private func lookupCert(_ cert: String) {
        state = .lookingUp(cert)
        Task {
            do {
                let card = try await psaService.lookupCert(cert)
                state = .found(card)
                HapticManager.shared.certFound()
            } catch let error as PSAServiceError {
                switch error {
                case .certNotFound:
                    state = .notFound(cert)
                case .notAuthenticated:
                    state = .error("PSA session expired. Sign in again in Settings.")
                default:
                    state = .error(error.localizedDescription)
                }
            } catch {
                state = .error(error.localizedDescription)
            }
        }
    }

    // MARK: - Manual Entry

    func showManualEntry() {
        cameraService.stopSession()
        state = .manualEntry
    }

    func submitManualCert() {
        guard let cert = CertValidator.cleaned(manualCertNumber) else {
            state = .error(CertValidator.validate(manualCertNumber) ?? "Invalid cert number.")
            return
        }
        lookupCert(cert)
    }

    // MARK: - Save

    func saveDraft(card: PSACard) {
        guard let context else {
            Log.camera.fault("saveDraft called before configure(context:userId:)")
            return
        }

        let listing = ListingRecordFactory.createDraft(
            from: card,
            entryPoint: "camera",
            userId: userId,
            thumbnailData: nil,
            in: context
        )

        do {
            try context.save()
            self.savedRecord = listing
            HapticManager.shared.postSuccess()
            state = .saved
        } catch {
            Log.camera.error("Failed to save draft: \(error)")
            state = .error("Failed to save draft.")
        }
    }

    // MARK: - Reset

    func reset() {
        lastDetectedCert = nil
        manualCertNumber = ""
        savedRecord = nil
        state = .scanning
        cameraService.resumeDetection()
        cameraService.startSession()
    }
}
