import SwiftUI
import AVFoundation

struct OnboardingCameraStep: View {
    let onScanComplete: (ListingRecord?) -> Void
    let onSkip: () -> Void

    @EnvironmentObject private var appState: AppState
    @Environment(\.managedObjectContext) private var context
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var appeared = false
    @State private var showCamera = false
    @State private var permissionDenied = false

    var body: some View {
        VStack(spacing: 0) {
            Spacer()
            cameraHeroSection
            permissionDeniedSection
            Spacer()
            cameraActions
        }
        .onAppear { appeared = true }
        .fullScreenCover(isPresented: $showCamera) {
            CameraView(onDismissWithRecord: { record in
                onScanComplete(record)
            })
            .environment(\.managedObjectContext, context)
            .environmentObject(appState)
        }
    }

    // MARK: - Subviews

    private var cameraHeroSection: some View {
        VStack(spacing: 0) {
            ZStack {
                RadialGradient(
                    colors: [Color.brandAccent.opacity(0.12), Color.clear],
                    center: .center,
                    startRadius: 20,
                    endRadius: 100
                )
                .frame(width: 200, height: 200)

                Image(systemName: "camera.viewfinder")
                    .font(.system(size: 72))
                    .foregroundColor(.brandAccent)
            }
            .opacity(appeared ? 1 : 0)
            .scaleEffect(appeared ? 1 : 0.8)
            .animation(Motion.contentReveal(reduceMotion: reduceMotion, delay: 0.1), value: appeared)

            Text("Scan your first card")
                .font(.sectionHeader)
                .foregroundColor(.labelPrimary)
                .padding(.top, Spacing.md)
                .opacity(appeared ? 1 : 0)
                .animation(Motion.contentReveal(reduceMotion: reduceMotion, delay: 0.2), value: appeared)

            Text("Slabr uses your camera to identify cards\nand auto-fill listing details.")
                .font(.cardMeta)
                .foregroundColor(.labelSecondary)
                .multilineTextAlignment(.center)
                .padding(.top, Spacing.sm)
                .opacity(appeared ? 1 : 0)
                .animation(Motion.contentReveal(reduceMotion: reduceMotion, delay: 0.3), value: appeared)
        }
    }

    @ViewBuilder
    private var permissionDeniedSection: some View {
        if permissionDenied {
            VStack(spacing: Spacing.sm) {
                Text("Camera access is needed to scan cards.")
                    .font(.cardMeta)
                    .foregroundColor(.labelSecondary)
                    .multilineTextAlignment(.center)

                Button("Open Settings") {
                    if let url = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(url)
                    }
                }
                .font(.cardTitle)
                .foregroundColor(.brandAccent)
            }
            .padding(.top, Spacing.lg)
            .transition(.opacity)
        }
    }

    private var cameraActions: some View {
        VStack(spacing: Spacing.sm) {
            PrimaryButton("Ready to scan") {
                requestCameraAndOpen()
            }

            Button("Skip for now") { onSkip() }
                .font(.cardMeta)
                .foregroundColor(.labelSecondary)
        }
        .padding(.horizontal, Spacing.screenMargin)
        .padding(.bottom, Spacing.xl)
        .opacity(appeared ? 1 : 0)
        .animation(Motion.contentReveal(reduceMotion: reduceMotion, delay: 0.4), value: appeared)
    }

    private func requestCameraAndOpen() {
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        switch status {
        case .authorized:
            showCamera = true
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { granted in
                DispatchQueue.main.async {
                    if granted {
                        showCamera = true
                    } else {
                        withAnimation { permissionDenied = true }
                    }
                }
            }
        case .denied, .restricted:
            withAnimation { permissionDenied = true }
        @unknown default:
            withAnimation { permissionDenied = true }
        }
    }
}
