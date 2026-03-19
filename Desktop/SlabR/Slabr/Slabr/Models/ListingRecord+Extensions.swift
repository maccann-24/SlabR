import CoreData

extension ListingRecord: Identifiable {}

extension ListingRecord {
    /// Returns the user's custom listing title if set, otherwise falls back to
    /// the card's generated title.
    var effectiveListingTitle: String {
        if let custom = listingTitle, !custom.isEmpty {
            return custom
        }
        return card?.generatedListingTitle ?? ""
    }

    /// Applies user's listing defaults from `UserSettingsEntity` to this record.
    /// Only applies if `listingFormat` is nil (first open) — the guard prevents
    /// overwriting user edits on subsequent opens.
    func applyDefaults(from settings: UserSettingsEntity) {
        guard listingFormat == nil else { return }

        listingFormat = settings.defaultFormat ?? ListingFormat.fixedPrice.rawValue
        acceptBestOffer = settings.acceptBestOffer

        if let amount = settings.minimumOfferAmount as Decimal?, amount > 0 {
            minimumOfferAmount = settings.minimumOfferAmount
        }

        auctionDurationDays = settings.auctionDurationDays
    }
}
