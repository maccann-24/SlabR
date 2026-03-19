import SwiftUI
import CoreData

@MainActor
final class ListingDefaultsViewModel: ObservableObject {
    @Published var format: ListingFormat = .fixedPrice
    @Published var acceptBestOffer: Bool = false
    @Published var minimumOfferText: String = ""
    @Published var auctionDurationDays: Int = 7
    @Published var buyItNowEnabled: Bool = false
    @Published var listingDurationDays: Int = 0
    @Published var returnsAccepted: Bool = true
    @Published var returnPeriodDays: Int = 30
    @Published var defaultShippingProfileId: UUID?
    @Published var defaultShippingProfileName: String = "None"

    let context: NSManagedObjectContext
    let userId: String
    private var entity: UserSettingsEntity?

    static let auctionDurations = [3, 5, 7, 10]
    static let listingDurations = [7, 10, 30, 0] // 0 = GTC

    init(context: NSManagedObjectContext, userId: String) {
        self.context = context
        self.userId = userId
        load()
    }

    func load() {
        let request = NSFetchRequest<UserSettingsEntity>(entityName: "UserSettingsEntity")
        request.predicate = NSPredicate(format: "userId == %@", userId)
        request.fetchLimit = 1

        do {
            if let existing = try context.fetch(request).first {
                entity = existing
                applyFromEntity(existing)
            } else {
                let new = UserSettingsEntity(context: context)
                new.userId = userId
                try context.save()
                entity = new
                applyFromEntity(new)
            }
        } catch {
            Log.settings.error("ListingDefaults load failed: \(error)")
        }

        loadDefaultShippingProfileName()
    }

    private func applyFromEntity(_ e: UserSettingsEntity) {
        format = ListingFormat(rawValue: e.defaultFormat ?? ListingFormat.fixedPrice.rawValue) ?? .fixedPrice
        acceptBestOffer = e.acceptBestOffer
        if let amount = e.minimumOfferAmount as Decimal?, amount > 0 {
            minimumOfferText = "\(amount)"
        } else {
            minimumOfferText = ""
        }
        auctionDurationDays = Int(e.auctionDurationDays)
        buyItNowEnabled = e.buyItNowEnabled
        listingDurationDays = Int(e.listingDurationDays)
        returnsAccepted = e.returnsAccepted
        returnPeriodDays = Int(e.returnPeriodDays)
        defaultShippingProfileId = e.defaultShippingProfileId
    }

    func save() {
        guard let entity else { return }
        entity.defaultFormat = format.rawValue
        entity.acceptBestOffer = acceptBestOffer
        if let decimal = Decimal(string: minimumOfferText), decimal > 0 {
            entity.minimumOfferAmount = decimal as NSDecimalNumber
        } else {
            entity.minimumOfferAmount = nil
        }
        entity.auctionDurationDays = Int16(auctionDurationDays)
        entity.buyItNowEnabled = buyItNowEnabled
        entity.listingDurationDays = Int16(listingDurationDays)
        entity.returnsAccepted = returnsAccepted
        entity.returnPeriodDays = Int16(returnPeriodDays)
        entity.defaultShippingProfileId = defaultShippingProfileId

        do {
            try context.save()
        } catch {
            Log.settings.error("ListingDefaults save failed: \(error)")
        }
    }

    func loadDefaultShippingProfileName() {
        guard let profileId = defaultShippingProfileId else {
            defaultShippingProfileName = "None"
            return
        }
        let request = NSFetchRequest<ShippingProfileEntity>(entityName: "ShippingProfileEntity")
        request.predicate = NSPredicate(format: "id == %@", profileId as CVarArg)
        request.fetchLimit = 1
        do {
            if let profile = try context.fetch(request).first {
                defaultShippingProfileName = profile.name ?? "Unnamed"
            } else {
                defaultShippingProfileName = "None"
            }
        } catch {
            Log.settings.error("Failed to load default shipping profile name: \(error)")
            defaultShippingProfileName = "None"
        }
    }

    func listingDurationLabel(_ days: Int) -> String {
        days == 0 ? "Good 'Til Cancelled" : "\(days) days"
    }
}
