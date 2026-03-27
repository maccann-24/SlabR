import XCTest
@testable import Slabr

final class SlabrProductTests: XCTestCase {

    func testAllProductIdsAreUnique() {
        let ids = SlabrProduct.allProductIds
        let uniqueIds = Set(ids)

        XCTAssertEqual(ids.count, uniqueIds.count, "All product IDs must be unique")
    }

    func testStarterMonthlyMapsToStarterTier() {
        XCTAssertEqual(SlabrProduct.starterMonthly.tier, .starter)
    }

    func testAllTiersHaveProducts() {
        let tiers: [AccessControl.SubscriptionTier] = [.starter, .seller, .pro, .power]

        for tier in tiers {
            let products = SlabrProduct.allCases.filter { $0.tier == tier }
            XCTAssertFalse(products.isEmpty, "Tier \(tier) must have at least one product")
        }
    }
}
