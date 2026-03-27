import XCTest
@testable import Slabr

@MainActor
final class AccessControlTests: XCTestCase {

    override func tearDown() {
        KeychainHelper.delete(key: KeychainKey.trialStartDate)
        AccessControl.invalidateTrialCache()
        AccessControl.subscriptionService = nil
        super.tearDown()
    }

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

    func testFreeFeaturesRequireFreeTier() {
        XCTAssertEqual(AccessControl.Feature.cameraCapture.requiredTier, .free)
    }

    func testStarterFeaturesRequireStarterTier() {
        XCTAssertEqual(AccessControl.Feature.psaImport.requiredTier, .starter)
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

    // MARK: - Trial
    //
    // These tests require Keychain access (OSStatus -34018 when code-signing is disabled).
    // They are skipped automatically when Keychain is unavailable.

    /// Returns true if Keychain save/read works in the current test environment.
    private func keychainIsAvailable() -> Bool {
        let testKey = "slabr_test_keychain_probe"
        let saved = KeychainHelper.save(key: testKey, value: "probe")
        KeychainHelper.delete(key: testKey)
        return saved
    }

    func testTrialActiveWithinSevenDays() throws {
        try XCTSkipUnless(keychainIsAvailable(), "Keychain unavailable (code-signing disabled)")

        let oneDayAgo = Calendar.current.date(byAdding: .day, value: -1, to: Date())!
        let dateString = AccessControl.iso8601Formatter.string(from: oneDayAgo)
        KeychainHelper.save(key: KeychainKey.trialStartDate, value: dateString)
        AccessControl.invalidateTrialCache()

        XCTAssertTrue(AccessControl.isTrialActive())
    }

    func testTrialExpiredAfterSevenDays() throws {
        try XCTSkipUnless(keychainIsAvailable(), "Keychain unavailable (code-signing disabled)")

        let eightDaysAgo = Calendar.current.date(byAdding: .day, value: -8, to: Date())!
        let dateString = AccessControl.iso8601Formatter.string(from: eightDaysAgo)
        KeychainHelper.save(key: KeychainKey.trialStartDate, value: dateString)
        AccessControl.invalidateTrialCache()

        XCTAssertFalse(AccessControl.isTrialActive())
    }

    func testTrialDaysRemainingComputation() throws {
        try XCTSkipUnless(keychainIsAvailable(), "Keychain unavailable (code-signing disabled)")

        let threeDaysAgo = Calendar.current.date(byAdding: .day, value: -3, to: Date())!
        let dateString = AccessControl.iso8601Formatter.string(from: threeDaysAgo)
        KeychainHelper.save(key: KeychainKey.trialStartDate, value: dateString)
        AccessControl.invalidateTrialCache()

        XCTAssertEqual(AccessControl.trialDaysRemaining(), 4)
    }
}
