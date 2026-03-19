import SwiftUI

struct ListingDefaultsView: View {
    @ObservedObject var viewModel: ListingDefaultsViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                header

                VStack(spacing: Spacing.cardGap) {
                    formatSection
                    bestOfferSection
                    if viewModel.format == .auction {
                        auctionDurationSection
                        buyItNowSection
                    }
                    if viewModel.format != .auction {
                        listingDurationSection
                    }
                    returnsSection
                    shippingProfileSection
                }
                .padding(.horizontal, Spacing.screenMargin)
            }
            .padding(.top, Spacing.md)
        }
        .background(Color.appBackground)
        .toolbar(.hidden, for: .navigationBar)
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
            Text("Listing defaults")
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

    // MARK: - Format

    private var formatSection: some View {
        CardSection(title: "Listing format") {
            HStack(spacing: Spacing.sm) {
                ForEach(ListingFormat.allCases) { fmt in
                    FilterChip(title: fmt.displayName, isSelected: viewModel.format == fmt) {
                        viewModel.format = fmt
                        viewModel.save()
                    }
                }
            }
        }
    }

    // MARK: - Best Offer

    private var bestOfferSection: some View {
        CardSection(title: "Best offer") {
            VStack(spacing: Spacing.md) {
                Toggle("Accept Best Offer", isOn: $viewModel.acceptBestOffer)
                    .font(.cardTitle)
                    .foregroundColor(.labelPrimary)
                    .tint(.brandAccent)
                    .onChange(of: viewModel.acceptBestOffer) { _ in viewModel.save() }

                if viewModel.acceptBestOffer {
                    HStack {
                        Text("Minimum offer")
                            .font(.cardMeta)
                            .foregroundColor(.labelSecondary)
                        Spacer()
                        HStack(spacing: Spacing.xs) {
                            Text("$")
                                .font(.cardMeta)
                                .foregroundColor(.labelSecondary)
                            TextField("0.00", text: $viewModel.minimumOfferText)
                                .keyboardType(.decimalPad)
                                .multilineTextAlignment(.trailing)
                                .font(.cardTitle)
                                .foregroundColor(.labelPrimary)
                                .frame(width: 80)
                                .onChange(of: viewModel.minimumOfferText) { _ in viewModel.save() }
                        }
                    }
                }
            }
        }
    }

    // MARK: - Auction Duration

    private var auctionDurationSection: some View {
        CardSection(title: "Auction duration") {
            HStack(spacing: Spacing.sm) {
                ForEach(ListingDefaultsViewModel.auctionDurations, id: \.self) { days in
                    FilterChip(title: "\(days) days", isSelected: viewModel.auctionDurationDays == days) {
                        viewModel.auctionDurationDays = days
                        viewModel.save()
                    }
                }
            }
        }
    }

    // MARK: - Buy It Now on Auction

    private var buyItNowSection: some View {
        CardSection(title: "Buy it now") {
            Toggle("Enable Buy It Now on Auction", isOn: $viewModel.buyItNowEnabled)
                .font(.cardTitle)
                .foregroundColor(.labelPrimary)
                .tint(.brandAccent)
                .onChange(of: viewModel.buyItNowEnabled) { _ in viewModel.save() }
        }
    }

    // MARK: - Listing Duration

    private var listingDurationSection: some View {
        CardSection(title: "Listing duration") {
            HStack(spacing: Spacing.sm) {
                ForEach(ListingDefaultsViewModel.listingDurations, id: \.self) { days in
                    FilterChip(
                        title: viewModel.listingDurationLabel(days),
                        isSelected: viewModel.listingDurationDays == days
                    ) {
                        viewModel.listingDurationDays = days
                        viewModel.save()
                    }
                }
            }
        }
    }

    // MARK: - Returns

    private var returnsSection: some View {
        CardSection(title: "Returns") {
            VStack(spacing: Spacing.md) {
                Toggle("Returns Accepted", isOn: $viewModel.returnsAccepted)
                    .font(.cardTitle)
                    .foregroundColor(.labelPrimary)
                    .tint(.brandAccent)
                    .onChange(of: viewModel.returnsAccepted) { _ in viewModel.save() }

                if viewModel.returnsAccepted {
                    HStack {
                        Text("Return period")
                            .font(.cardMeta)
                            .foregroundColor(.labelSecondary)
                        Spacer()
                        HStack(spacing: Spacing.sm) {
                            FilterChip(title: "30 days", isSelected: viewModel.returnPeriodDays == 30) {
                                viewModel.returnPeriodDays = 30
                                viewModel.save()
                            }
                            FilterChip(title: "60 days", isSelected: viewModel.returnPeriodDays == 60) {
                                viewModel.returnPeriodDays = 60
                                viewModel.save()
                            }
                        }
                    }
                }
            }
        }
    }

    // MARK: - Shipping Profile

    private var shippingProfileSection: some View {
        NavigationLink {
            ShippingProfilesView(
                viewModel: ShippingProfilesViewModel(context: viewModel.context, userId: viewModel.userId),
                onDefaultChanged: { id, name in
                    viewModel.defaultShippingProfileId = id
                    viewModel.defaultShippingProfileName = name
                    viewModel.save()
                }
            )
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("Default shipping profile")
                        .font(.cardTitle)
                        .foregroundColor(.labelPrimary)
                    Text(viewModel.defaultShippingProfileName)
                        .font(.cardMeta)
                        .foregroundColor(.labelSecondary)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .foregroundColor(.labelSecondary)
                    .font(.caption)
            }
            .padding(Spacing.cardPadding)
            .background(Color.cardSurface)
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
    }

}
