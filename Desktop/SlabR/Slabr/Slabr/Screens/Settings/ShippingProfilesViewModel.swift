import SwiftUI
import CoreData

@MainActor
final class ShippingProfilesViewModel: ObservableObject {
    @Published var profiles: [ShippingProfile] = []
    @Published var showAddSheet = false
    @Published var editingProfile: ShippingProfile?

    // Form fields
    @Published var formName: String = ""
    @Published var formService: String = "USPS"
    @Published var formHandlingDays: Int = 1
    @Published var formBuyerPays: Bool = true
    @Published var formIsDefault: Bool = false

    let context: NSManagedObjectContext
    let userId: String
    static let services = ["USPS", "UPS", "FedEx"]

    /// Cached entity lookup — avoids re-fetching by ID on every mutation.
    private var entityMap: [UUID: ShippingProfileEntity] = [:]

    init(context: NSManagedObjectContext, userId: String) {
        self.context = context
        self.userId = userId
        fetchProfiles()
    }

    func fetchProfiles() {
        let request = NSFetchRequest<ShippingProfileEntity>(entityName: "ShippingProfileEntity")
        request.predicate = NSPredicate(format: "userId == %@", userId)
        request.sortDescriptors = [NSSortDescriptor(key: "name", ascending: true)]
        do {
            let entities = try context.fetch(request)
            entityMap = Dictionary(uniqueKeysWithValues: entities.compactMap { e in
                guard let id = e.id else { return nil }
                return (id, e)
            })
            profiles = entities.map { e in
                ShippingProfile(
                    id: e.id ?? UUID(),
                    name: e.name ?? "",
                    service: e.service ?? "USPS",
                    handlingDays: Int(e.handlingDays),
                    buyerPays: e.buyerPays,
                    isDefault: e.isDefault
                )
            }
        } catch {
            Log.settings.error("ShippingProfiles fetch failed: \(error)")
        }
    }

    func resetForm() {
        formName = ""
        formService = "USPS"
        formHandlingDays = 1
        formBuyerPays = true
        formIsDefault = profiles.isEmpty
        editingProfile = nil
    }

    func loadFormForEdit(_ profile: ShippingProfile) {
        editingProfile = profile
        formName = profile.name
        formService = profile.service
        formHandlingDays = profile.handlingDays
        formBuyerPays = profile.buyerPays
        formIsDefault = profile.isDefault
    }

    func saveProfile() {
        guard !formName.trimmingCharacters(in: .whitespaces).isEmpty else { return }

        if formIsDefault {
            clearAllDefaults()
        }

        if let editing = editingProfile {
            updateExisting(editing)
        } else {
            createNew()
        }

        do {
            try context.save()
            fetchProfiles()
        } catch {
            Log.settings.error("ShippingProfiles save failed: \(error)")
        }
    }

    private func createNew() {
        let entity = ShippingProfileEntity(context: context)
        entity.id = UUID()
        entity.userId = userId
        entity.name = formName
        entity.service = formService
        entity.handlingDays = Int16(formHandlingDays)
        entity.buyerPays = formBuyerPays
        entity.isDefault = formIsDefault || profiles.isEmpty
    }

    private func updateExisting(_ profile: ShippingProfile) {
        guard let entity = entityMap[profile.id] else {
            Log.settings.error("ShippingProfiles updateExisting: entity not found for id \(profile.id)")
            return
        }
        entity.name = formName
        entity.service = formService
        entity.handlingDays = Int16(formHandlingDays)
        entity.buyerPays = formBuyerPays
        entity.isDefault = formIsDefault
    }

    func deleteProfile(_ profile: ShippingProfile) {
        guard let entity = entityMap[profile.id] else {
            Log.settings.error("ShippingProfiles deleteProfile: entity not found for id \(profile.id)")
            return
        }
        let wasDefault = entity.isDefault
        context.delete(entity)
        do {
            try context.save()
            fetchProfiles()
            if wasDefault, let first = profiles.first {
                setDefault(first)
            }
        } catch {
            Log.settings.error("ShippingProfiles delete failed: \(error)")
        }
    }

    func setDefault(_ profile: ShippingProfile) {
        clearAllDefaults()
        guard let entity = entityMap[profile.id] else {
            Log.settings.error("ShippingProfiles setDefault: entity not found for id \(profile.id)")
            return
        }
        entity.isDefault = true
        do {
            try context.save()
            fetchProfiles()
        } catch {
            Log.settings.error("ShippingProfiles setDefault save failed: \(error)")
        }
    }

    private func clearAllDefaults() {
        for entity in entityMap.values where entity.isDefault {
            entity.isDefault = false
        }
    }

    var defaultProfile: ShippingProfile? {
        profiles.first(where: \.isDefault)
    }
}
