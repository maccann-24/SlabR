import SwiftUI
import CoreData

/// Manages the unified camera flow — a 12-state machine handling both PSA slab
/// OCR scanning and raw card photo capture. Auto-detects card type via color heuristic,
/// then routes to the appropriate flow.
///
/// States: detecting → detectedType → scanning/rawReady → found/rawCaptured → saved
/// Future: rawIdentifying, rawVerifying (AI confidence tiers)
@MainActor
final class CameraViewModel: ObservableObject {

    enum CameraState: Equatable {
        // Detection phase
        case detecting
        case detectedType(CardScanType)

        // PSA slab flow
        case scanning
        case detected(String)
        case lookingUp(String)
        case found(PSACard)

        // Raw card flow
        case rawReady
        case rawCaptured(UIImage)
        // Future: case rawIdentifying, case rawVerifying(PSACard, Int)

        // Shared
        case notFound(String)
        case error(String)
        case manualEntry
        case saved

        static func == (lhs: CameraState, rhs: CameraState) -> Bool {
            switch (lhs, rhs) {
            case (.detecting, .detecting): return true
            case (.detectedType(let a), .detectedType(let b)): return a == b
            case (.scanning, .scanning): return true
            case (.detected(let a), .detected(let b)): return a == b
            case (.lookingUp(let a), .lookingUp(let b)): return a == b
            case (.found(let a), .found(let b)): return a == b
            case (.rawReady, .rawReady): return true
            case (.rawCaptured, .rawCaptured): return true
            case (.notFound(let a), .notFound(let b)): return a == b
            case (.error(let a), .error(let b)): return a == b
            case (.manualEntry, .manualEntry): return true
            case (.saved, .saved): return true
            default: return false
            }
        }
    }

    @Published var state: CameraState = .detecting
    @Published var manualCertNumber: String = ""
    @Published private(set) var savedRecord: ListingRecord?
    @Published private(set) var capturedImage: UIImage?

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
        cameraService.onCertDetected = { [weak self] cert in
            self?.certDetected(cert)
        }
        cameraService.onCardTypeDetected = { [weak self] type in
            self?.cardTypeDetected(type)
        }
        cameraService.startSession()
        state = .detecting
    }

    func stopCamera() {
        cameraService.stopSession()
    }

    // MARK: - Card Type Detection

    /// Called from CameraService when the color heuristic resolves card type.
    func cardTypeDetected(_ type: CardScanType) {
        state = .detectedType(type)
        HapticManager.shared.imageSelected()

        // Auto-transition after brief badge flash
        Task {
            try? await Task.sleep(for: .milliseconds(800))
            switch type {
            case .psaSlab:
                guard KeychainHelper.read(key: "psaToken") != nil else {
                    state = .error("Sign in to PSA first (Settings → PSA account).")
                    return
                }
                state = .scanning
            case .rawCard:
                state = .rawReady
            case .unknown:
                break // Stay on .detectedType(.unknown) — show fallback chips
            }
        }
    }

    /// User manually selects card type from fallback chips.
    func userSelectedType(_ type: CardScanType) {
        cardTypeDetected(type == .unknown ? .rawCard : type)
    }

    // MARK: - PSA Slab Detection

    /// Called from CameraService when OCR finds an 8-digit cert number.
    func certDetected(_ cert: String) {
        guard state == .scanning else { return }
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

    // MARK: - PSA Lookup

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

    // MARK: - Raw Card Capture

    func captureRawPhoto() {
        HapticManager.shared.cameraCapture()
        Task {
            if let image = await cameraService.capturePhoto() {
                capturedImage = image
                state = .rawCaptured(image)
            } else {
                state = .error("Failed to capture photo.")
            }
        }
    }

    /// User confirms captured photo — proceed to listing builder with blank fields.
    func proceedWithRawCard() {
        guard let context, let image = capturedImage else { return }

        let thumbnailData = image.jpegData(compressionQuality: 0.7)
        capturedImage = nil // Release full-res image (~36MB) — thumbnail data is sufficient

        let listing = ListingRecordFactory.createRawDraft(
            userId: userId,
            thumbnailData: thumbnailData,
            in: context
        )

        do {
            try context.save()
            self.savedRecord = listing
            HapticManager.shared.postSuccess()
            state = .saved
        } catch {
            Log.camera.error("Failed to save raw draft: \(error)")
            state = .error("Failed to save draft.")
        }
    }

    // MARK: - PSA Save

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
        listing.card?.entryMethod = "camera_psa"

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
        capturedImage = nil
        state = .detecting
        cameraService.resumeDetection()
        cameraService.startSession()
    }
}
