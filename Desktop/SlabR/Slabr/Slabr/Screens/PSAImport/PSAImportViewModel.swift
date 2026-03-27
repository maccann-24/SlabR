import SwiftUI
import CoreData

/// Manages the PSA card import flow — a 9-state machine:
/// `idle → pickingImage → extracting → lookingUp(certNumber) → found(PSACard)`
/// with fallback paths to `needsManualCert`, `needsCredentials`, `notFound`, `error`, and `saved`.
///
/// Dependencies are injected via init for testability: `PSAServiceProtocol` for API calls,
/// and a closure for Vision OCR. Production defaults use the real singletons.
@MainActor
final class PSAImportViewModel: ObservableObject {

    enum ImportState: Equatable {
        case idle
        case pickingImage
        case extracting
        case lookingUp(certNumber: String)
        case found(PSACard)
        case notFound(certNumber: String)
        case needsManualCert
        case needsCredentials
        case error(String)
        case saved
    }

    @Published var state: ImportState = .idle
    @Published var manualCertNumber: String = ""
    @Published var username: String = ""
    @Published var password: String = ""
    @Published var selectedImage: UIImage?
    @Published private(set) var savedRecord: ListingRecord?

    private var context: NSManagedObjectContext?
    private var userId: String = ""
    private let psaService: PSAServiceProtocol
    private let extractCertNumberFn: (UIImage) async throws -> String?

    init(
        psaService: PSAServiceProtocol = PSAService.shared,
        extractCertNumber: @escaping (UIImage) async throws -> String? = VisionService.extractCertNumber
    ) {
        self.psaService = psaService
        self.extractCertNumberFn = extractCertNumber
    }

    func configure(context: NSManagedObjectContext, userId: String) {
        self.context = context
        self.userId = userId
    }

    func start() {
        if KeychainHelper.read(key: KeychainKey.psaToken) == nil {
            state = .needsCredentials
        } else {
            state = .pickingImage
        }
    }

    /// Authenticates with PSA. Captures credentials locally and clears the `@Published`
    /// properties **before** the async call — a security pattern to minimize time
    /// credentials spend in observable memory.
    func signIn() {
        guard !username.isEmpty, !password.isEmpty else { return }
        let capturedUser = username
        let capturedPass = password
        username = ""
        password = ""
        Task {
            do {
                try await psaService.authenticate(username: capturedUser, password: capturedPass)
                state = .pickingImage
            } catch {
                state = .error(error.localizedDescription)
                HapticManager.shared.warning()
            }
        }
    }

    func imageSelected(_ image: UIImage) {
        selectedImage = image
        state = .extracting
        HapticManager.shared.imageSelected()
        extractAndLookup(image)
    }

    func submitManualCert() {
        guard let cert = CertValidator.cleaned(manualCertNumber) else {
            state = .error(CertValidator.validate(manualCertNumber) ?? "Invalid cert number.")
            return
        }
        lookupCert(cert)
    }

    func saveDraft(card: PSACard) {
        guard let context else {
            Log.importing.fault("saveDraft called before configure(context:userId:)")
            return
        }

        let imageData = selectedImage?.jpegData(compressionQuality: 0.85)
        let listing = ListingRecordFactory.createDraft(
            from: card,
            entryPoint: "psa",
            userId: userId,
            thumbnailData: selectedImage?.jpegData(compressionQuality: 0.7),
            imageData: imageData,
            in: context
        )

        do {
            try context.save()
            self.savedRecord = listing
            selectedImage = nil
            HapticManager.shared.postSuccess()
            state = .saved
        } catch {
            Log.importing.error("Failed to save draft: \(error)")
            state = .error("Failed to save draft.")
        }
    }

    func retry() {
        state = .pickingImage
    }

    // MARK: - Private

    private func extractAndLookup(_ image: UIImage) {
        Task {
            do {
                if let cert = try await extractCertNumberFn(image) {
                    lookupCert(cert)
                } else {
                    state = .needsManualCert
                }
            } catch {
                state = .needsManualCert
            }
        }
    }

    private func lookupCert(_ cert: String) {
        state = .lookingUp(certNumber: cert)
        Task {
            do {
                let card = try await psaService.lookupCert(cert)
                state = .found(card)
                HapticManager.shared.certFound()
            } catch let error as PSAServiceError {
                switch error {
                case .certNotFound:
                    state = .notFound(certNumber: cert)
                case .notAuthenticated:
                    state = .needsCredentials
                default:
                    state = .error(error.localizedDescription)
                }
            } catch {
                state = .error(error.localizedDescription)
            }
        }
    }
}
