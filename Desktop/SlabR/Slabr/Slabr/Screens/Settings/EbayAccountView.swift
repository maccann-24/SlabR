import SwiftUI

struct EbayAccountView: View {
    @StateObject private var viewModel = EbayAccountViewModel()
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var showUnlinkConfirmation = false
    @State private var appeared = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                header
                content
            }
            .padding(.top, Spacing.md)
        }
        .background(Color.appBackground)
        .toolbar(.hidden, for: .navigationBar)
        .onAppear {
            viewModel.checkLinkStatus()
            appeared = true
        }
        .alert("Unlink eBay Account", isPresented: $showUnlinkConfirmation) {
            Button("Cancel", role: .cancel) {}
            Button("Unlink", role: .destructive) {
                viewModel.unlinkAccount()
            }
        } message: {
            Text("You will need to sign in again to publish listings to eBay.")
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            Button(action: { dismiss() }) {
                Image(systemName: "chevron.left")
                    .foregroundColor(.labelPrimary)
                    .font(.body.weight(.semibold))
            }
            Spacer()
            Text("eBay Account")
                .font(.sectionHeader)
                .foregroundColor(.labelPrimary)
            Spacer()
            // Balance spacer
            Image(systemName: "chevron.left")
                .foregroundColor(.clear)
                .font(.body.weight(.semibold))
        }
        .padding(.horizontal, Spacing.screenMargin)
    }

    // MARK: - Content

    private var content: some View {
        VStack(spacing: Spacing.cardGap) {
            if viewModel.isLoading {
                loadingCard
            } else if viewModel.isLinked {
                linkedCard
            } else {
                unlinkedCard
            }

            if let error = viewModel.error {
                errorBanner(message: error)
            }
        }
        .padding(.horizontal, Spacing.screenMargin)
    }

    // MARK: - Unlinked State

    private var unlinkedCard: some View {
        VStack(spacing: Spacing.lg) {
            accountIcon(
                systemName: "link.badge.plus",
                color: .brandAccent
            )

            VStack(spacing: Spacing.sm) {
                Text("Connect Your eBay Account")
                    .font(.cardTitle)
                    .foregroundColor(.labelPrimary)

                Text("Link your eBay account to publish listings directly from Slabr.")
                    .font(.cardMeta)
                    .foregroundColor(.labelSecondary)
                    .multilineTextAlignment(.center)
            }

            PrimaryButton("Link eBay Account") {
                Task {
                    await viewModel.linkAccount()
                }
            }
        }
        .padding(Spacing.xl)
        .frame(maxWidth: .infinity)
        .background(Color.cardSurface)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 8)
        .animation(Motion.contentReveal(reduceMotion: reduceMotion, delay: 0.1), value: appeared)
    }

    // MARK: - Linked State

    private var linkedCard: some View {
        VStack(spacing: Spacing.lg) {
            accountIcon(
                systemName: "checkmark.circle.fill",
                color: .positive
            )

            VStack(spacing: Spacing.sm) {
                HStack(spacing: Spacing.sm) {
                    Text("Linked")
                        .font(.captionMedium)
                        .foregroundColor(.positive)
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, Spacing.xs)
                        .background(Color.positive.opacity(0.12))
                        .clipShape(Capsule())
                }

                if !viewModel.username.isEmpty {
                    Text(viewModel.username)
                        .font(.cardTitle)
                        .foregroundColor(.labelPrimary)
                }

                Text("Your eBay account is connected. Listings can be published directly.")
                    .font(.cardMeta)
                    .foregroundColor(.labelSecondary)
                    .multilineTextAlignment(.center)
            }

            Button {
                showUnlinkConfirmation = true
            } label: {
                Text("Unlink Account")
                    .font(.body.weight(.semibold))
                    .foregroundColor(.negative)
                    .frame(maxWidth: .infinity)
                    .frame(height: 56)
                    .background(Color.negative.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
            }
        }
        .padding(Spacing.xl)
        .frame(maxWidth: .infinity)
        .background(Color.cardSurface)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 8)
        .animation(Motion.contentReveal(reduceMotion: reduceMotion, delay: 0.1), value: appeared)
    }

    // MARK: - Loading State

    private var loadingCard: some View {
        VStack(spacing: Spacing.lg) {
            ProgressView()
                .controlSize(.large)
                .tint(.brandAccent)

            VStack(spacing: Spacing.sm) {
                Text("Connecting to eBay")
                    .font(.cardTitle)
                    .foregroundColor(.labelPrimary)

                Text("Complete the sign-in in the browser window.")
                    .font(.cardMeta)
                    .foregroundColor(.labelSecondary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(Spacing.xl)
        .frame(maxWidth: .infinity)
        .background(Color.cardSurface)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    // MARK: - Error Banner

    private func errorBanner(message: String) -> some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(.negative)
                .frame(width: 28)

            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text("Connection Failed")
                    .font(.cardTitle)
                    .foregroundColor(.labelPrimary)
                Text(message)
                    .font(.cardMeta)
                    .foregroundColor(.labelSecondary)
            }

            Spacer()

            Button {
                Task {
                    await viewModel.linkAccount()
                }
            } label: {
                Text("Retry")
                    .font(.captionMedium)
                    .foregroundColor(.brandAccent)
            }
        }
        .padding(Spacing.cardPadding)
        .background(Color.negative.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    // MARK: - Shared Components

    private func accountIcon(systemName: String, color: Color) -> some View {
        ZStack {
            RadialGradient(
                colors: [color.opacity(0.08), Color.clear],
                center: .center,
                startRadius: 10,
                endRadius: 60
            )
            .frame(width: 120, height: 120)

            Image(systemName: systemName)
                .font(.system(size: 48))
                .foregroundColor(color)
        }
    }
}
