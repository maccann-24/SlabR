import SwiftUI

struct CameraView: View {
    var onDismissWithRecord: ((ListingRecord?) -> Void)?

    @EnvironmentObject private var appState: AppState
    @Environment(\.managedObjectContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @StateObject private var viewModel = CameraViewModel()
    @State private var showListingBuilder = false
    @State private var scanLineOffset: CGFloat = 8

    var body: some View {
        ZStack {
            // Layer 1: Camera preview
            #if targetEnvironment(simulator)
            Color.black.ignoresSafeArea()
            Text("Camera not available\nin Simulator")
                .foregroundColor(.white.opacity(0.5))
                .multilineTextAlignment(.center)
            #else
            CameraPreviewView(previewLayer: viewModel.cameraService.getPreviewLayer())
                .ignoresSafeArea()
            #endif

            // Layer 2: Guide overlay (PSA slab or raw card)
            if viewModel.state == .scanning {
                psaGuideOverlay
            } else if viewModel.state == .rawReady {
                rawGuideOverlay
            }

            // Layer 3: State-specific content
            VStack {
                topBar
                Spacer()
                stateContent
                Spacer()
                bottomActions
            }
            .padding(.horizontal, Spacing.screenMargin)
            .padding(.top, Spacing.xl)
            .padding(.bottom, Spacing.lg)
        }
        .background(Color.black)
        .onAppear {
            viewModel.configure(context: context, userId: appState.userId)
            viewModel.startCamera()
            withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
                scanLineOffset = 92
            }
        }
        .onDisappear {
            viewModel.stopCamera()
        }
        .sheet(isPresented: $showListingBuilder) {
            if let record = viewModel.savedRecord {
                ListingBuilderView(listing: record)
                    .environment(\.managedObjectContext, context)
                    .presentationDetents([.large])
            }
        }
    }

    // MARK: - Top Bar

    private var topBar: some View {
        HStack {
            Button {
                onDismissWithRecord?(viewModel.savedRecord)
                dismiss()
            } label: {
                Image(systemName: "xmark")
                    .font(.title3.weight(.semibold))
                    .foregroundColor(.white)
                    .frame(width: 44, height: 44)
            }
            Spacer()
            if viewModel.state == .scanning || viewModel.state == .rawReady || viewModel.state == .detecting {
                Button { viewModel.cameraService.toggleTorch() } label: {
                    Image(systemName: "bolt.fill")
                        .font(.title3)
                        .foregroundColor(.white)
                        .frame(width: 44, height: 44)
                }
            }
        }
    }

    // MARK: - Guide Overlay

    private func guideOverlay(
        width: CGFloat, height: CGFloat, yFraction: CGFloat,
        label: String, showScanLine: Bool = false
    ) -> some View {
        GeometryReader { geo in
            let frameY = geo.size.height * yFraction

            ZStack {
                Color.black.opacity(0.4).ignoresSafeArea()
                RoundedRectangle(cornerRadius: 16)
                    .frame(width: width, height: height)
                    .position(x: geo.size.width / 2, y: frameY)
                    .blendMode(.destinationOut)
            }
            .compositingGroup()

            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(Color.brandAccent.opacity(0.6), style: StrokeStyle(lineWidth: 2, dash: [8, 6]))
                .frame(width: width, height: height)
                .position(x: geo.size.width / 2, y: frameY)

            if showScanLine {
                Rectangle()
                    .fill(Color.brandAccent.opacity(0.3))
                    .frame(width: width - 16, height: 2)
                    .position(x: geo.size.width / 2, y: frameY - height / 2 + scanLineOffset)
            }

            Text(label)
                .font(.cardMeta)
                .foregroundColor(.white.opacity(0.8))
                .position(x: geo.size.width / 2, y: frameY + height / 2 + 24)
        }
    }

    private var psaGuideOverlay: some View {
        guideOverlay(width: 300, height: 100, yFraction: 0.55, label: "Position slab label in frame", showScanLine: true)
    }

    private var rawGuideOverlay: some View {
        guideOverlay(width: 260, height: 360, yFraction: 0.45, label: "Position card in frame")
    }

    // MARK: - State Content

    @ViewBuilder
    private var stateContent: some View {
        switch viewModel.state {
        case .detecting:                statusOverlay(icon: nil, message: "Scanning...", showSpinner: true)
        case .detectedType(let type):   detectedTypeBadge(type)
        case .scanning, .rawReady:      EmptyView()
        case .detected(let cert):       certBadge(cert)
        case .lookingUp(let cert):      statusOverlay(icon: nil, message: "Looking up \(cert)...", showSpinner: true)
        case .found(let card):          ScrollView { PSACardDetailView(card: card).padding(.horizontal, Spacing.screenMargin) }.frame(maxHeight: 300)
        case .rawCaptured:              if let img = viewModel.capturedImage { Image(uiImage: img).resizable().scaledToFit().frame(maxHeight: 300).clipShape(RoundedRectangle(cornerRadius: 8)) }
        case .notFound(let cert):       statusOverlay(icon: "magnifyingglass", title: "Cert not found", message: "No results for \(cert).")
        case .error(let msg):           statusOverlay(icon: "exclamationmark.triangle", message: msg)
        case .manualEntry:              manualEntryContent
        case .saved:                    savedContent
        }
    }

    // MARK: - State Content Helpers

    private func statusOverlay(icon: String? = nil, title: String? = nil, message: String, showSpinner: Bool = false) -> some View {
        VStack(spacing: Spacing.md) {
            if showSpinner { ProgressView().tint(.white) }
            if let icon { Image(systemName: icon).font(.system(size: 40)).foregroundColor(.white.opacity(0.5)) }
            if let title { Text(title).font(.cardTitle).foregroundColor(.white) }
            Text(message).font(.cardMeta).foregroundColor(.white.opacity(0.7)).multilineTextAlignment(.center)
        }
    }

    private func certBadge(_ cert: String) -> some View {
        VStack(spacing: Spacing.md) {
            Text(cert)
                .font(.system(size: 32, weight: .bold, design: .monospaced))
                .foregroundColor(.white)
                .padding(.horizontal, Spacing.lg)
                .padding(.vertical, Spacing.sm)
                .background(Color.brandAccent)
                .clipShape(Capsule())
            Text("Cert number detected")
                .font(.cardMeta)
                .foregroundColor(.white.opacity(0.7))
        }
    }

    private var manualEntryContent: some View {
        VStack(spacing: Spacing.md) {
            Text("Enter cert number").font(.cardTitle).foregroundColor(.white)
            SlabRTextField(placeholder: "8-digit cert number", text: $viewModel.manualCertNumber)
                .frame(maxWidth: 240)
        }
    }

    private var savedContent: some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: "checkmark.circle.fill").font(.system(size: 48)).foregroundColor(.brandAccent)
            Text("Draft saved").font(.cardTitle).foregroundColor(.white)
        }
    }

    // MARK: - Detection Badge

    @ViewBuilder
    private func detectedTypeBadge(_ type: CardScanType) -> some View {
        switch type {
        case .psaSlab:
            Text("PSA Slab")
                .font(.cardTitle)
                .foregroundColor(.white)
                .padding(.horizontal, Spacing.lg)
                .padding(.vertical, Spacing.sm)
                .background(Color.positive)
                .clipShape(RoundedRectangle(cornerRadius: 20))
                .transition(.scale.combined(with: .opacity))

        case .rawCard:
            Text("Raw Card")
                .font(.cardTitle)
                .foregroundColor(.white)
                .padding(.horizontal, Spacing.lg)
                .padding(.vertical, Spacing.sm)
                .background(Color.brandAccent)
                .clipShape(RoundedRectangle(cornerRadius: 20))
                .transition(.scale.combined(with: .opacity))

        case .unknown:
            VStack(spacing: Spacing.md) {
                Text("Which is this?")
                    .font(.cardMeta)
                    .foregroundColor(.white.opacity(0.7))
                HStack(spacing: Spacing.md) {
                    Button { viewModel.userSelectedType(.psaSlab) } label: {
                        Label("Graded Slab", systemImage: "trophy")
                            .font(.cardTitle)
                            .foregroundColor(.white)
                            .padding(.horizontal, Spacing.md)
                            .padding(.vertical, Spacing.sm)
                            .background(Color.positive.opacity(0.8))
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                    }
                    .accessibilityLabel("Graded Slab")
                    .accessibilityHint("Select if scanning a PSA graded card")

                    Button { viewModel.userSelectedType(.rawCard) } label: {
                        Label("Raw Card", systemImage: "rectangle.portrait")
                            .font(.cardTitle)
                            .foregroundColor(.white)
                            .padding(.horizontal, Spacing.md)
                            .padding(.vertical, Spacing.sm)
                            .background(Color.brandAccent.opacity(0.8))
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                    }
                    .accessibilityLabel("Raw Card")
                    .accessibilityHint("Select if scanning an ungraded card")
                }
            }
        }
    }

    // MARK: - Bottom Actions

    @ViewBuilder
    private var bottomActions: some View {
        switch viewModel.state {
        case .detecting, .detectedType, .lookingUp:
            EmptyView()

        case .scanning:
            Button { viewModel.showManualEntry() } label: {
                Text("Enter manually")
                    .font(.cardMeta)
                    .foregroundColor(.white.opacity(0.7))
            }

        case .detected:
            VStack(spacing: Spacing.sm) {
                PrimaryButton("Look up") { viewModel.confirmLookup() }
                Button("Scan again") { viewModel.reset() }
                    .font(.cardMeta)
                    .foregroundColor(.white.opacity(0.7))
            }

        case .found(let card):
            PrimaryButton("Save as draft") { viewModel.saveDraft(card: card) }

        case .rawReady:
            VStack(spacing: Spacing.md) {
                // Shutter button
                Button {
                    viewModel.captureRawPhoto()
                } label: {
                    Circle()
                        .stroke(Color.white, lineWidth: 4)
                        .frame(width: 72, height: 72)
                        .overlay(Circle().fill(Color.white).frame(width: 64, height: 64))
                }
                .accessibilityLabel("Capture photo")
                .accessibilityHint("Takes a photo of the card")
            }

        case .rawCaptured:
            VStack(spacing: Spacing.sm) {
                PrimaryButton("Use photo") { viewModel.proceedWithRawCard() }
                Button("Retake") { viewModel.reset() }
                    .font(.cardMeta)
                    .foregroundColor(.white.opacity(0.7))
            }

        case .notFound:
            VStack(spacing: Spacing.sm) {
                PrimaryButton("Scan again") { viewModel.reset() }
                Button("Enter manually") { viewModel.showManualEntry() }
                    .font(.cardMeta)
                    .foregroundColor(.white.opacity(0.7))
            }

        case .error:
            PrimaryButton("Try again") { viewModel.reset() }

        case .manualEntry:
            PrimaryButton("Look up") { viewModel.submitManualCert() }

        case .saved:
            VStack(spacing: Spacing.sm) {
                PrimaryButton("Continue to listing") {
                    if let callback = onDismissWithRecord {
                        callback(viewModel.savedRecord)
                        dismiss()
                    } else {
                        showListingBuilder = true
                    }
                }
                Button("Done") {
                    onDismissWithRecord?(viewModel.savedRecord)
                    dismiss()
                }
                .font(.cardMeta)
                .foregroundColor(.white.opacity(0.7))
            }
        }
    }
}
