import SwiftUI

struct OnboardingView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.managedObjectContext) private var context
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var currentStep = 0
    @State private var onboardingScanRecord: ListingRecord?
    @State private var showListingBuilder = false

    private let totalSteps = 4

    var body: some View {
        ZStack {
            Color.appBackground.ignoresSafeArea()

            VStack(spacing: 0) {
                if currentStep > 0 {
                    StepIndicator(current: currentStep, total: totalSteps)
                        .padding(.top, Spacing.lg)
                        .padding(.bottom, Spacing.md)
                        .transition(.opacity)
                }

                Group {
                    switch currentStep {
                    case 0:
                        OnboardingWelcomeStep {
                            advance()
                        }
                    case 1:
                        OnboardingSellerModeStep(
                            onContinue: { advance() },
                            onSkip: { advance() }
                        )
                    case 2:
                        OnboardingCameraStep(
                            onScanComplete: { record in
                                onboardingScanRecord = record
                                advance()
                            },
                            onSkip: { advance() }
                        )
                    case 3:
                        OnboardingCompleteStep(
                            scannedRecord: onboardingScanRecord,
                            onFinish: {
                                appState.completeOnboarding()
                            },
                            onContinueToListing: { _ in
                                appState.completeOnboarding()
                                showListingBuilder = true
                            }
                        )
                    default:
                        EmptyView()
                    }
                }
                .transition(.asymmetric(
                    insertion: .move(edge: .trailing).combined(with: .opacity),
                    removal: .move(edge: .leading).combined(with: .opacity)
                ))
                .id(currentStep)
            }
        }
        .animation(Motion.contentReveal(reduceMotion: reduceMotion), value: currentStep)
        .sheet(isPresented: $showListingBuilder) {
            if let record = onboardingScanRecord {
                ListingBuilderView(listing: record)
                    .environment(\.managedObjectContext, context)
                    .presentationDetents([.large])
            }
        }
    }

    private func advance() {
        withAnimation(Motion.contentReveal(reduceMotion: reduceMotion)) {
            currentStep += 1
        }
    }
}
