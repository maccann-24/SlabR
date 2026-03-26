import SwiftUI
import CoreData

struct ListingBuilderView: View {
    @Environment(\.managedObjectContext) private var context
    @StateObject private var viewModel: ListingBuilderViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var showUpgradeSheet = false
    @State private var showConditionGuide = false

    init(listing: ListingRecord) {
        _viewModel = StateObject(wrappedValue: ListingBuilderViewModel(listing: listing))
    }

    var body: some View {
        VStack(spacing: Spacing.lg) {
            DragHandle()

            switch viewModel.state {
            case .editing, .error:
                editingContent
            case .publishing:
                Spacer()
                ProgressView("Publishing...")
                Spacer()
            case .published(let listingId):
                publishedContent(listingId: listingId)
            }
        }
        .padding(.top, Spacing.md)
        .background(Color.appBackground)
        .task { viewModel.loadThumbnail() }
        .onDisappear {
            if case .editing = viewModel.state {
                viewModel.saveDraft()
            }
        }
        .sheet(isPresented: $showUpgradeSheet) {
            UpgradeSheet(feature: .directEbayPublish)
                .presentationDetents([.medium])
        }
    }

    // MARK: - Editing

    private var editingContent: some View {
        VStack(spacing: 0) {
            Text("Create listing")
                .font(.sectionHeader)
                .foregroundColor(.labelPrimary)

            ScrollView {
                VStack(spacing: Spacing.cardGap) {
                    thumbnailSection
                    titleSection
                    priceSection
                    formatSection

                    if viewModel.isRawCard {
                        conditionSection
                    }

                    if viewModel.format != .auction {
                        bestOfferSection
                    }

                    if viewModel.format == .auction {
                        auctionDurationSection
                    }

                    cardDetailsSection

                    if case .error(let msg) = viewModel.state {
                        errorBanner(msg)
                    }
                }
                .padding(.horizontal, Spacing.screenMargin)
                .padding(.top, Spacing.md)
                .padding(.bottom, Spacing.xl)
            }

            bottomButtons
        }
    }

    // MARK: - Thumbnail

    private var thumbnailSection: some View {
        Group {
            if let uiImage = viewModel.thumbnailImage {
                Image(uiImage: uiImage)
                    .resizable()
                    .scaledToFit()
                    .frame(maxHeight: 200)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .frame(maxWidth: .infinity)
            }
        }
    }

    // MARK: - Title

    private var titleSection: some View {
        CardSection(title: "Listing title") {
            VStack(alignment: .trailing, spacing: Spacing.xs) {
                TextField("Listing title", text: $viewModel.title)
                    .font(.cardTitle)
                    .foregroundColor(.labelPrimary)

                Text("\(viewModel.title.count)/80")
                    .font(.caption)
                    .foregroundColor(viewModel.title.count > 80 ? .negative : .labelSecondary)
            }
        }
    }

    // MARK: - Price

    private var priceSection: some View {
        CardSection(title: "Price") {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                HStack(spacing: Spacing.xs) {
                    Text("$")
                        .font(.heroNumber)
                        .foregroundColor(.labelSecondary)
                    TextField("0.00", text: $viewModel.priceText)
                        .keyboardType(.decimalPad)
                        .font(.heroNumber)
                        .foregroundColor(.labelPrimary)
                        .onChange(of: viewModel.priceText) { _ in
                            viewModel.updatePriceValidation()
                        }
                }

                if let error = viewModel.priceError {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.negative)
                }
            }
        }
    }

    // MARK: - Condition (Raw Cards Only)

    private var conditionSection: some View {
        CardSection(title: "") {
            ConditionSelector(
                selectedCondition: $viewModel.condition,
                showGuideButton: viewModel.showConditionGuideButton(userId: viewModel.recordUserId),
                onGuideRequested: { showConditionGuide = true }
            )
        }
        .sheet(isPresented: $showConditionGuide) {
            ConditionGuideSheet()
                .presentationDetents([.large])
        }
    }

    // MARK: - Format

    private var formatSection: some View {
        CardSection(title: "Listing format") {
            HStack(spacing: Spacing.sm) {
                ForEach(ListingFormat.allCases) { fmt in
                    FilterChip(title: fmt.displayName, isSelected: viewModel.format == fmt) {
                        viewModel.format = fmt
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
                ForEach([3, 5, 7, 10], id: \.self) { days in
                    FilterChip(title: "\(days) days", isSelected: viewModel.auctionDurationDays == days) {
                        viewModel.auctionDurationDays = days
                    }
                }
            }
        }
    }

    // MARK: - Card Details

    private var cardDetailsSection: some View {
        CardSection(title: "Card details") {
            cardDetailRows
        }
    }

    @ViewBuilder
    private var cardDetailRows: some View {
        VStack(spacing: Spacing.sm) {
            DetailRow(label: "Player", value: viewModel.playerName)

            if !viewModel.year.isEmpty {
                DetailRow(label: "Year", value: viewModel.year)
            }

            if !viewModel.brand.isEmpty {
                DetailRow(label: "Brand", value: viewModel.brand)
            }

            if !viewModel.setName.isEmpty {
                DetailRow(label: "Set", value: viewModel.setName)
            }

            if !viewModel.cardNumber.isEmpty {
                DetailRow(label: "Card number", value: viewModel.cardNumber)
            }

            if let parallel = viewModel.parallel, !parallel.isEmpty {
                DetailRow(label: "Parallel", value: parallel)
            }

            if let grade = viewModel.grade, !grade.isEmpty {
                DetailRow(label: "Grade", value: "PSA \(grade)")
            }

            if let cert = viewModel.certNumber, !cert.isEmpty {
                DetailRow(label: "Cert", value: cert)
            }

            rookieBadge
        }
    }

    @ViewBuilder
    private var rookieBadge: some View {
        if viewModel.isRookie {
            HStack(spacing: Spacing.xs) {
                Image(systemName: "star.fill")
                    .foregroundColor(.brandAccent)
                    .font(.caption)
                Text("Rookie")
                    .font(.captionMedium)
                    .foregroundColor(.brandAccent)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    // MARK: - Error Banner

    private func errorBanner(_ message: String) -> some View {
        Text(message)
            .font(.cardMeta)
            .foregroundColor(.negative)
            .padding(Spacing.cardPadding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.negative.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    // MARK: - Bottom Buttons

    private var bottomButtons: some View {
        VStack(spacing: Spacing.sm) {
            PrimaryButton("Publish to eBay", isEnabled: viewModel.canPublish) {
                if viewModel.canPublishToEbay(userId: viewModel.recordUserId) {
                    viewModel.publish()
                } else {
                    showUpgradeSheet = true
                }
            }
            Button("Save draft") {
                viewModel.saveDraft()
                dismiss()
            }
            .font(.cardMeta)
            .foregroundColor(.labelSecondary)
        }
        .padding(.horizontal, Spacing.screenMargin)
        .padding(.bottom, Spacing.md)
    }

    // MARK: - Published

    private func publishedContent(listingId: String) -> some View {
        VStack(spacing: Spacing.md) {
            Spacer()
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 48))
                .foregroundColor(.brandAccent)
            Text("Listed on eBay")
                .font(.sectionHeader)
                .foregroundColor(.labelPrimary)
            Text(listingId)
                .font(.cardMeta)
                .foregroundColor(.labelSecondary)
            Spacer()
            PrimaryButton("Done") { dismiss() }
                .padding(.horizontal, Spacing.screenMargin)
                .padding(.bottom, Spacing.md)
        }
    }
}
