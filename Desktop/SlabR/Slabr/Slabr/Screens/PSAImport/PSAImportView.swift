import SwiftUI
import PhotosUI

struct PSAImportView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.managedObjectContext) private var context
    @StateObject private var viewModel = PSAImportViewModel()
    @Environment(\.dismiss) private var dismiss
    @State private var showListingBuilder = false

    var body: some View {
        VStack(spacing: Spacing.lg) {
            DragHandle()

            Text("Import PSA scan")
                .font(.sectionHeader)
                .foregroundColor(.labelPrimary)

            switch viewModel.state {
            case .idle, .pickingImage:
                Spacer()

            case .extracting:
                Spacer()
                ProgressView("Reading cert number...")
                Spacer()

            case .lookingUp(let cert):
                Spacer()
                ProgressView("Looking up \(cert)...")
                Spacer()

            case .needsManualCert:
                manualCertView
                Spacer()

            case .needsCredentials:
                credentialForm
                Spacer()

            case .found(let card):
                ScrollView {
                    VStack(spacing: Spacing.lg) {
                        PSACardDetailView(card: card)
                        PrimaryButton("Save as draft") {
                            viewModel.saveDraft(card: card)
                        }
                    }
                    .padding(.horizontal, Spacing.screenMargin)
                }

            case .notFound(let cert):
                Spacer()
                EmptyState(
                    icon: "magnifyingglass",
                    title: "Cert not found",
                    message: "No results for \(cert) in the PSA database."
                )
                PrimaryButton("Try again") { viewModel.retry() }
                    .padding(.horizontal, Spacing.screenMargin)
                Spacer()

            case .error(let msg):
                Spacer()
                EmptyState(
                    icon: "exclamationmark.triangle",
                    title: "Something went wrong",
                    message: msg
                )
                PrimaryButton("Try again") { viewModel.retry() }
                    .padding(.horizontal, Spacing.screenMargin)
                Spacer()

            case .saved:
                Spacer()
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 48))
                    .foregroundColor(.brandAccent)
                Text("Draft saved")
                    .font(.cardTitle)
                    .foregroundColor(.labelPrimary)
                Spacer()
                VStack(spacing: Spacing.sm) {
                    PrimaryButton("Continue to listing") { showListingBuilder = true }
                    Button("Done") { dismiss() }
                        .font(.cardMeta)
                        .foregroundColor(.labelSecondary)
                }
                .padding(.horizontal, Spacing.screenMargin)
            }
        }
        .padding(.top, Spacing.md)
        .background(Color.appBackground)
        .onAppear {
            viewModel.configure(context: context, userId: appState.userId)
            viewModel.start()
        }
        .sheet(isPresented: isPickingImage) {
            PHPickerRepresentable(
                onImageSelected: { viewModel.imageSelected($0) },
                onCancel: { dismiss() }
            )
        }
        .sheet(isPresented: $showListingBuilder) {
            if let record = viewModel.savedRecord {
                ListingBuilderView(listing: record)
                    .environment(\.managedObjectContext, context)
                    .presentationDetents([.large])
            }
        }
    }

    private var isPickingImage: Binding<Bool> {
        Binding(
            get: { viewModel.state == .pickingImage },
            set: { if !$0 { dismiss() } }
        )
    }

    // MARK: - Manual Cert Entry

    private var manualCertView: some View {
        VStack(spacing: Spacing.md) {
            if let image = viewModel.selectedImage {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .frame(maxHeight: 160)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }

            Text("We couldn't read the cert number automatically. Enter it below.")
                .font(.cardMeta)
                .foregroundColor(.labelSecondary)
                .multilineTextAlignment(.center)

            SlabRTextField(
                placeholder: "8-digit cert number",
                text: $viewModel.manualCertNumber
            )

            PrimaryButton("Look up") { viewModel.submitManualCert() }
        }
        .padding(.horizontal, Spacing.screenMargin)
    }

    // MARK: - Credentials

    private var credentialForm: some View {
        VStack(spacing: Spacing.md) {
            Text("Sign in to look up cert data. Credentials stored on-device.")
                .font(.cardMeta)
                .foregroundColor(.labelSecondary)
                .multilineTextAlignment(.center)
                .lineLimit(nil)

            SlabRTextField(
                placeholder: "Username",
                text: $viewModel.username,
                contentType: .username,
                autocapitalization: .never,
                disableAutocorrection: true
            )

            SlabRTextField(
                placeholder: "Password",
                text: $viewModel.password,
                isSecure: true,
                contentType: .password
            )

            PrimaryButton("Sign in") { viewModel.signIn() }
        }
        .padding(.horizontal, Spacing.screenMargin)
    }
}

// MARK: - PHPicker

private struct PHPickerRepresentable: UIViewControllerRepresentable {
    let onImageSelected: (UIImage) -> Void
    let onCancel: () -> Void

    func makeUIViewController(context: Context) -> PHPickerViewController {
        var config = PHPickerConfiguration()
        config.filter = .images
        config.selectionLimit = 1
        let picker = PHPickerViewController(configuration: config)
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: PHPickerViewController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(parent: self) }

    final class Coordinator: NSObject, PHPickerViewControllerDelegate {
        let parent: PHPickerRepresentable

        init(parent: PHPickerRepresentable) {
            self.parent = parent
        }

        func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
            picker.dismiss(animated: true)

            guard let provider = results.first?.itemProvider,
                  provider.canLoadObject(ofClass: UIImage.self) else {
                parent.onCancel()
                return
            }

            provider.loadObject(ofClass: UIImage.self) { [weak self] object, _ in
                DispatchQueue.main.async {
                    if let image = object as? UIImage {
                        self?.parent.onImageSelected(image)
                    } else {
                        self?.parent.onCancel()
                    }
                }
            }
        }
    }
}
