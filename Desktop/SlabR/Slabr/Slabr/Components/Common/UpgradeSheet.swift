import SwiftUI
import StoreKit

struct UpgradeSheet: View {
    let feature: AccessControl.Feature
    @EnvironmentObject private var subscriptionService: SubscriptionService
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var selectedProduct: Product?
    @State private var isPurchasing = false
    @State private var purchaseError: String?

    // MARK: - Computed

    /// Products matching the required tier, sorted by price (monthly first, then annual).
    private var tierProducts: [Product] {
        let requiredTier = feature.requiredTier
        return subscriptionService.availableProducts.filter { product in
            guard let slabrProduct = SlabrProduct(rawValue: product.id) else { return false }
            return slabrProduct.tier == requiredTier
        }
        .sorted { $0.price < $1.price }
    }

    private var monthlyProduct: Product? {
        tierProducts.first { $0.id.contains(".monthly") }
    }

    private var annualProduct: Product? {
        tierProducts.first { $0.id.contains(".annual") }
    }

    /// Monthly-equivalent price for the annual plan, for savings display.
    private var annualMonthlyPrice: String? {
        guard let annual = annualProduct else { return nil }
        let monthly = annual.price / 12
        return monthly.formatted(annual.priceFormatStyle)
    }

    /// Savings percentage when choosing annual over monthly.
    private var savingsPercent: Int? {
        guard let monthly = monthlyProduct, let annual = annualProduct else { return nil }
        let monthlyAnnualized = monthly.price * 12
        guard monthlyAnnualized > 0 else { return nil }
        let savings = ((monthlyAnnualized - annual.price) / monthlyAnnualized * 100)
        return NSDecimalNumber(decimal: savings).intValue
    }

    // MARK: - Body

    var body: some View {
        VStack(spacing: Spacing.lg) {
            DragHandle()

            headerSection

            if tierProducts.isEmpty {
                loadingOrUnavailable
            } else {
                productOptions
                subscribeButton
            }

            Spacer()

            footerLinks
        }
        .padding(.top, Spacing.md)
        .background(Color.appBackground)
        .alert("Purchase Failed", isPresented: .constant(purchaseError != nil)) {
            Button("OK") { purchaseError = nil }
        } message: {
            Text(purchaseError ?? "")
        }
        .onAppear {
            // Pre-select monthly by default
            selectedProduct = monthlyProduct ?? annualProduct
        }
    }

    // MARK: - Sections

    private var headerSection: some View {
        VStack(spacing: Spacing.sm) {
            Image(systemName: "lock.fill")
                .font(.system(size: 40))
                .foregroundColor(.brandAccent)

            Text(feature.displayName)
                .font(.sectionHeader)
                .foregroundColor(.labelPrimary)

            Text("\(feature.displayName) requires **\(feature.requiredTier.displayName)** or higher.")
                .font(.cardMeta)
                .foregroundColor(.labelSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.screenMargin)
        }
    }

    private var loadingOrUnavailable: some View {
        VStack(spacing: Spacing.sm) {
            if subscriptionService.availableProducts.isEmpty {
                ProgressView()
                    .padding(.top, Spacing.lg)
                Text("Loading subscriptions...")
                    .font(.cardMeta)
                    .foregroundColor(.labelSecondary)
            } else {
                Text("No plans available for this tier.")
                    .font(.cardMeta)
                    .foregroundColor(.labelSecondary)
                    .padding(.top, Spacing.lg)
            }
        }
    }

    private var productOptions: some View {
        HStack(spacing: Spacing.cardGap) {
            if let monthly = monthlyProduct {
                productCard(
                    product: monthly,
                    label: "Monthly",
                    priceLabel: monthly.displayPrice + "/mo",
                    badge: nil
                )
            }

            if let annual = annualProduct {
                productCard(
                    product: annual,
                    label: "Annual",
                    priceLabel: (annualMonthlyPrice ?? annual.displayPrice) + "/mo",
                    badge: savingsPercent.map { "Save \($0)%" }
                )
            }
        }
        .padding(.horizontal, Spacing.screenMargin)
    }

    private func productCard(
        product: Product,
        label: String,
        priceLabel: String,
        badge: String?
    ) -> some View {
        let isSelected = selectedProduct?.id == product.id
        return Button {
            withAnimation(reduceMotion ? .none : .easeInOut(duration: 0.2)) {
                selectedProduct = product
            }
            HapticManager.shared.buttonTapped()
        } label: {
            VStack(spacing: Spacing.sm) {
                Text(label)
                    .font(.cardTitle)
                    .foregroundColor(.labelPrimary)

                Text(priceLabel)
                    .font(.cardMeta)
                    .foregroundColor(isSelected ? .brandAccent : .labelSecondary)

                if let badge {
                    Text(badge)
                        .font(.captionMedium)
                        .foregroundColor(.brandAccent)
                } else {
                    // Spacer to maintain equal height
                    Text(" ")
                        .font(.captionMedium)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(Spacing.cardPadding)
            .background(Color.cardSurface)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(isSelected ? Color.brandAccent : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
    }

    private var subscribeButton: some View {
        VStack(spacing: Spacing.sm) {
            if let product = selectedProduct {
                PrimaryButton(
                    "Subscribe \u{2014} \(product.displayPrice)\(product.id.contains(".annual") ? "/yr" : "/mo")",
                    isEnabled: !isPurchasing
                ) {
                    Task { await handlePurchase(product) }
                }

                tierBenefits
            }
        }
        .padding(.horizontal, Spacing.screenMargin)
        .overlay {
            if isPurchasing {
                ProgressView()
                    .scaleEffect(1.2)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color.appBackground.opacity(0.6))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
            }
        }
    }

    private var tierBenefits: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            benefitRow("PSA scan import & camera capture")
            benefitRow("Publish directly to eBay")
            if feature.requiredTier >= .seller {
                benefitRow("Speed mode & batch imports")
                benefitRow("Listing templates")
            }
            if feature.requiredTier >= .pro {
                benefitRow("AI pricing suggestions")
            }
            if feature.requiredTier >= .power {
                benefitRow("Analytics export & multi-store")
            }
        }
        .padding(Spacing.cardPadding)
        .background(Color.cardSurface)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var footerLinks: some View {
        VStack(spacing: Spacing.sm) {
            Button {
                Task {
                    isPurchasing = true
                    await subscriptionService.restorePurchases()
                    isPurchasing = false
                    if subscriptionService.currentTier >= feature.requiredTier {
                        dismiss()
                    }
                }
            } label: {
                Text("Restore Purchases")
                    .font(.cardMeta)
                    .foregroundColor(.brandAccent)
            }

            HStack(spacing: Spacing.xs) {
                Link("Terms of Use", destination: URL(string: "https://slabr.app/terms")!)
                Text("&")
                    .foregroundColor(.labelSecondary)
                Link("Privacy Policy", destination: URL(string: "https://slabr.app/privacy")!)
            }
            .font(.captionMedium)
            .foregroundColor(.labelSecondary)

            Button("Not now") { dismiss() }
                .font(.cardMeta)
                .foregroundColor(.labelSecondary)
        }
        .padding(.bottom, Spacing.md)
    }

    // MARK: - Helpers

    private func benefitRow(_ text: String) -> some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundColor(.brandAccent)
                .font(.caption)
            Text(text)
                .font(.cardMeta)
                .foregroundColor(.labelPrimary)
        }
    }

    private func handlePurchase(_ product: Product) async {
        isPurchasing = true
        defer { isPurchasing = false }

        do {
            let transaction = try await subscriptionService.purchase(product)
            if transaction != nil {
                HapticManager.shared.success()
                dismiss()
            }
        } catch {
            HapticManager.shared.error()
            purchaseError = "Something went wrong. Please try again."
            Log.subscription.error("Purchase failed: \(error)")
        }
    }
}
