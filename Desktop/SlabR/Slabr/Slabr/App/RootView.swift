import SwiftUI

struct RootView: View {
    @StateObject private var appState = AppState()

    var body: some View {
        VStack(spacing: 0) {
            // Tab content — ZStack keeps all tabs alive to preserve navigation/scroll state
            ZStack {
                NavigationStack {
                    DashboardView()
                }
                .opacity(appState.selectedTab == .home || appState.selectedTab == .add ? 1 : 0)
                .allowsHitTesting(appState.selectedTab == .home || appState.selectedTab == .add)

                NavigationStack {
                    ListingsView()
                }
                .opacity(appState.selectedTab == .listings ? 1 : 0)
                .allowsHitTesting(appState.selectedTab == .listings)

                NavigationStack {
                    AnalyticsView()
                }
                .opacity(appState.selectedTab == .analytics ? 1 : 0)
                .allowsHitTesting(appState.selectedTab == .analytics)

                NavigationStack {
                    SettingsView()
                }
                .opacity(appState.selectedTab == .settings ? 1 : 0)
                .allowsHitTesting(appState.selectedTab == .settings)
            }
            .frame(maxHeight: .infinity)

            // Custom tab bar — always last in VStack, never overlaid
            CustomTabBar(selectedTab: $appState.selectedTab) {
                appState.showEntryPointSheet = true
            }
        }
        .environmentObject(appState)
        .background(Color.appBackground)
        .sheet(isPresented: $appState.showEntryPointSheet, onDismiss: {
            switch appState.pendingEntryPoint {
            case .psaImport:
                appState.showPSAImport = true
            case .camera:
                appState.showCamera = true
            case nil:
                break
            }
            appState.pendingEntryPoint = nil
        }) {
            EntryPointSheet(appState: appState)
                .presentationDetents([.medium])
        }
        .sheet(isPresented: $appState.showPSAImport) {
            PSAImportView()
                .environment(\.managedObjectContext, PersistenceController.shared.container.viewContext)
                .environmentObject(appState)
                .presentationDetents([.medium, .large])
        }
        .fullScreenCover(isPresented: $appState.showCamera) {
            CameraView()
                .environment(\.managedObjectContext, PersistenceController.shared.container.viewContext)
                .environmentObject(appState)
                .preferredColorScheme(.dark)
        }
    }
}

// Entry point selection — bottom sheet from FAB
struct EntryPointSheet: View {
    @ObservedObject var appState: AppState
    @Environment(\.dismiss) private var dismiss
    @State private var blockedFeature: AccessControl.Feature?

    var body: some View {
        VStack(spacing: Spacing.lg) {
            DragHandle()

            Text("New Listing")
                .font(.sectionHeader)
                .foregroundColor(.labelPrimary)

            VStack(spacing: Spacing.cardGap) {
                EntryPointButton(
                    title: "Import PSA Scan",
                    subtitle: "Select scan from camera roll",
                    icon: "photo.on.rectangle",
                    tileColor: .tilePSA
                ) {
                    if AccessControl.hasAccess(userId: appState.userId, feature: .psaImport) {
                        appState.pendingEntryPoint = .psaImport
                        dismiss()
                    } else {
                        blockedFeature = .psaImport
                    }
                }

                EntryPointButton(
                    title: "Scan Raw Card",
                    subtitle: "Use camera to identify card",
                    icon: "camera.fill",
                    tileColor: .tileCamera
                ) {
                    if AccessControl.hasAccess(userId: appState.userId, feature: .cameraCapture) {
                        appState.pendingEntryPoint = .camera
                        dismiss()
                    } else {
                        blockedFeature = .cameraCapture
                    }
                }
            }
            .padding(.horizontal, Spacing.screenMargin)

            Spacer()
        }
        .padding(.top, Spacing.md)
        .background(Color.appBackground)
        .sheet(item: $blockedFeature) { feature in
            UpgradeSheet(feature: feature)
                .presentationDetents([.medium])
        }
    }
}

struct EntryPointButton: View {
    let title: String
    let subtitle: String
    let icon: String
    let tileColor: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: Spacing.md) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(.brandAccent)
                    .frame(width: 48, height: 48)
                    .background(tileColor)
                    .clipShape(RoundedRectangle(cornerRadius: 16))

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(title)
                        .font(.cardTitle)
                        .foregroundColor(.labelPrimary)
                    Text(subtitle)
                        .font(.cardMeta)
                        .foregroundColor(.labelSecondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .foregroundColor(.labelSecondary)
            }
            .padding(Spacing.cardPadding)
            .background(Color.cardSurface)
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
    }
}
