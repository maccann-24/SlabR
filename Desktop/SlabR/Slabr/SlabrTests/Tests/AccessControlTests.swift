import XCTest
@testable import Slabr

final class AccessControlTests: XCTestCase {

    // MARK: - Tier Comparison

    func testFreeUserDeniedStarterFeatures() {
        XCTAssertFalse(AccessControl.hasAccess(userId: "test", feature: .psaImport))
    }

    func testTierComparisonFreeVsStarter() {
        XCTAssertTrue(AccessControl.SubscriptionTier.free < .starter)
    }

    func testTierComparisonStarterVsSeller() {
        XCTAssertTrue(AccessControl.SubscriptionTier.starter < .seller)
    }

    func testTierComparisonProVsPower() {
        XCTAssertTrue(AccessControl.SubscriptionTier.pro < .power)
    }

    func testTierComparisonPowerVsLifetime() {
        XCTAssertTrue(AccessControl.SubscriptionTier.power < .lifetime)
    }

    func testTierEqualityIsReflexive() {
        XCTAssertFalse(AccessControl.SubscriptionTier.seller < .seller)
    }

    // MARK: - Feature Tier Mapping

    func testStarterFeaturesRequireStarterTier() {
        XCTAssertEqual(AccessControl.Feature.psaImport.requiredTier, .starter)
        XCTAssertEqual(AccessControl.Feature.cameraCapture.requiredTier, .starter)
        XCTAssertEqual(AccessControl.Feature.directEbayPublish.requiredTier, .starter)
    }

    func testSellerFeaturesRequireSellerTier() {
        XCTAssertEqual(AccessControl.Feature.speedMode.requiredTier, .seller)
        XCTAssertEqual(AccessControl.Feature.batchMode.requiredTier, .seller)
        XCTAssertEqual(AccessControl.Feature.templates.requiredTier, .seller)
    }

    func testProAndPowerFeatures() {
        XCTAssertEqual(AccessControl.Feature.pricingSuggestion.requiredTier, .pro)
        XCTAssertEqual(AccessControl.Feature.analyticsExport.requiredTier, .power)
        XCTAssertEqual(AccessControl.Feature.multiStore.requiredTier, .power)
    }
}
