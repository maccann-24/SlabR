import Foundation

struct ShippingProfile: Identifiable {
    let id: UUID
    var name: String
    var service: String
    var handlingDays: Int
    var buyerPays: Bool
    var isDefault: Bool
}
