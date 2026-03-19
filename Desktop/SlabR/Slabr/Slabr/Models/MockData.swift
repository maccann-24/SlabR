import Foundation
import UIKit

enum MockData {
    static let psaCard = PSACard(
        certNumber: "12345678",
        playerName: "Shohei Ohtani",
        year: "2023",
        brand: "Topps",
        setName: "Chrome",
        cardNumber: "150",
        parallel: "Prizm Blue Refractor",
        grade: "10",
        gradeDescription: "GEM-MT 10",
        isRookie: false,
        population: 45
    )

    static let rookiePSACard = PSACard(
        certNumber: "87654321",
        playerName: "Victor Wembanyama",
        year: "2023",
        brand: "Panini",
        setName: "Prizm",
        cardNumber: "280",
        parallel: nil,
        grade: "10",
        gradeDescription: "GEM-MT 10",
        isRookie: true,
        population: 12
    )

    static let shippingProfile = ShippingProfile(
        id: UUID(),
        name: "Standard Shipping",
        service: "USPS First Class",
        handlingDays: 1,
        buyerPays: true,
        isDefault: true
    )

}
