import SwiftUI

struct CameraView: View {
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
            Button { dismiss() } label: {
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

    // MARK: - PSA Guide Overlay

    private var psaGuideOverlay: some View {
        GeometryReader { geo in
            let frameWidth: CGFloat = 300
            let frameHeight: CGFloat = 100
            let frameY = geo.size.height * 0.55

            ZStack {
                Color.black.opacity(0.4).ignoresSafeArea()
                RoundedRectangle(cornerRadius: 12)
                    .frame(width: frameWidth, height: frameHeight)
                    .position(x: geo.size.width / 2, y: frameY)
                    .blendMode(.destinationOut)
            }
            .compositingGroup()

            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(Color.brandAccent.opacity(0.6), style: StrokeStyle(lineWidth: 2, dash: [8, 6]))
                .frame(width: frameWidth, height: frameHeight)
                .position(x: geo.size.width / 2, y: frameY)

            Rectangle()
                .fill(Color.brandAccent.opacity(0.3))
                .frame(width: frameWidth - 16, height: 2)
                .position(x: geo.size.width / 2, y: frameY - frameHeight / 2 + scanLineOffset)

            Text("Position slab label in frame")
                .font(.cardMeta)
                .foregroundColor(.white.opacity(0.8))
                .position(x: geo.size.width / 2, y: frameY + frameHeight / 2 + 24)
        }
    }

    // MARK: - Raw Card Guide Overlay

    private var rawGuideOverlay: some View {
        GeometryReader { geo in
            let frameWidth: CGFloat = 260
            let frameHeight: CGFloat = 360
            let frameY = geo.size.height * 0.45

            ZStack {
                Color.black.opacity(0.4).ignoresSafeArea()
                RoundedRectangle(cornerRadius: 16)
                    .frame(width: frameWidth, height: frameHeight)
                    .position(x: geo.size.width / 2, y: frameY)
                    .blendMode(.destinationOut)
            }
            .compositingGroup()

            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(Color.brandAccent.opacity(0.6), style: StrokeStyle(lineWidth: 2, dash: [8, 6]))
                .frame(width: frameWidth, height: frameHeight)
                .position(x: geo.size.width / 2, y: frameY)

            Text("Position card in frame")
                .font(.cardMeta)
                .foregroundColor(.white.opacity(0.8))
                .position(x: geo.size.width / 2, y: frameY + frameHeight / 2 + 24)
        }
    }

    // MARK: - State Content

    @ViewBuilder
    private var stateContent: some View {
        switch viewModel.state {
        case .detecting:
            VStack(spacing: Spacing.md) {
                ProgressView()
                    .tint(.white)
                Text("Scanning...")
                    .font(.cardMeta)
                    .foregroundColor(.white.opacity(0.7))
            }

        case .detectedType(let type):
            detectedTypeBadge(type)

        case .scanning:
            EmptyView()

        case .detected(let cert):
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

        case .lookingUp(let cert):
            VStack(spacing: Spacing.md) {
                ProgressView()
                    .tint(.white)
                Text("Looking up \(cert)...")
                    .font(.cardMeta)
                    .foregroundColor(.white.opacity(0.7))
            }

        case .found(let card):
            ScrollView {
                PSACardDetailView(card: card)
                    .padding(.horizontal, Spacing.screenMargin)
            }
            .frame(maxHeight: 300)

        case .rawReady:
            EmptyView()

        case .rawCaptured(let image):
            Image(uiImage: image)
                .resizable()
                .scaledToFit()
                .frame(maxHeight: 300)
                .clipShape(RoundedRectangle(cornerRadius: 8))

        case .notFound(let cert):
            VStack(spacing: Spacing.md) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 40))
                    .foregroundColor(.white.opacity(0.5))
                Text("Cert not found")
                    .font(.cardTitle)
                    .foregroundColor(.white)
                Text("No results for \(cert).")
                    .font(.cardMeta)
                    .foregroundColor(.white.opacity(0.7))
                    .multilineTextAlignment(.center)
            }

        case .error(let msg):
            VStack(spacing: Spacing.md) {
                Image(systemName: "exclamationmark.triangle")
                    .font(.system(size: 40))
                    .foregroundColor(.white.opacity(0.5))
                Text(msg)
                    .font(.cardMeta)
                    .foregroundColor(.white.opacity(0.7))
                    .multilineTextAlignment(.center)
            }

        case .manualEntry:
            VStack(spacing: Spacing.md) {
                Text("Enter cert number")
                    .font(.cardTitle)
                    .foregroundColor(.white)
                SlabRTextField(
                    placeholder: "8-digit cert number",
                    text: $viewModel.manualCertNumber
                )
                .frame(maxWidth: 240)
            }

        case .saved:
            VStack(spacing: Spacing.md) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 48))
                    .foregroundColor(.brandAccent)
                Text("Draft saved")
                    .font(.cardTitle)
                    .foregroundColor(.white)
            }
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
                .scaleEffect(reduceMotion ? 1 : 1)
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
                PrimaryButton("Continue to listing") { showListingBuilder = true }
                Button("Done") { dismiss() }
                    .font(.cardMeta)
                    .foregroundColor(.white.opacity(0.7))
            }
        }
    }
}
