import SwiftUI

struct ListingRow: View {
    let listing: ListingRecord
    let isDraft: Bool

    private static let priceFormatter: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencyCode = "USD"
        return f
    }()

    var body: some View {
        HStack(spacing: Spacing.md) {
            thumbnail
            cardInfo
            Spacer()
            trailingContent
            if isDraft {
                Image(systemName: "chevron.right")
                    .foregroundColor(.labelSecondary)
                    .font(.caption)
            }
        }
        .padding(Spacing.cardPadding)
        .background(Color.cardSurface)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var thumbnail: some View {
        ThumbnailView(data: listing.media?.thumbnailData, size: 56)
    }

    private var cardInfo: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            Text(listing.card?.playerName ?? "Unknown")
                .font(.cardTitle)
                .foregroundColor(.labelPrimary)
                .lineLimit(1)

            let meta = [
                listing.card.flatMap { $0.year > 0 ? "\($0.year)" : nil },
                listing.card?.brand,
                listing.card?.setName
            ].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " ")

            if !meta.isEmpty {
                Text(meta)
                    .font(.cardMeta)
                    .foregroundColor(.labelSecondary)
                    .lineLimit(1)
            }
        }
    }

    private var trailingContent: some View {
        VStack(alignment: .trailing, spacing: Spacing.xs) {
            statusBadge

            if let price = listing.listingPrice as Decimal?, price > 0 {
                Text(Self.priceFormatter.string(from: price as NSDecimalNumber) ?? "$0.00")
                    .font(.cardMeta)
                    .foregroundColor(.labelPrimary)
            }
        }
    }

    private var statusBadge: some View {
        Text(isDraft ? "Draft" : "Listed")
            .font(.captionMedium)
            .foregroundColor(isDraft ? .labelSecondary : .white)
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, 2)
            .background(isDraft ? Color.elevatedSurface : Color.brandAccent)
            .clipShape(Capsule())
    }
}
