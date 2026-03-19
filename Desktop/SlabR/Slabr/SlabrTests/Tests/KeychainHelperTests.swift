import XCTest
@testable import Slabr

final class KeychainHelperTests: XCTestCase {

    private let testPrefix = "slabr_test_\(UUID().uuidString.prefix(8))_"

    override func tearDown() {
        // Clean up all test keys
        for suffix in ["roundtrip", "missing", "delete", "overwrite", "empty"] {
            KeychainHelper.delete(key: testPrefix + suffix)
        }
        super.tearDown()
    }

    func testSaveAndReadRoundTrip() {
        let key = testPrefix + "roundtrip"
        KeychainHelper.save(key: key, value: "hello")
        XCTAssertEqual(KeychainHelper.read(key: key), "hello")
    }

    func testReadNonExistentKeyReturnsNil() {
        let key = testPrefix + "missing"
        XCTAssertNil(KeychainHelper.read(key: key))
    }

    func testDeleteRemovesValue() {
        let key = testPrefix + "delete"
        KeychainHelper.save(key: key, value: "toDelete")
        KeychainHelper.delete(key: key)
        XCTAssertNil(KeychainHelper.read(key: key))
    }

    func testSaveOverwritesExistingValue() {
        let key = testPrefix + "overwrite"
        KeychainHelper.save(key: key, value: "first")
        KeychainHelper.save(key: key, value: "second")
        XCTAssertEqual(KeychainHelper.read(key: key), "second")
    }

    func testSaveEmptyStringSucceeds() {
        let key = testPrefix + "empty"
        KeychainHelper.save(key: key, value: "")
        XCTAssertEqual(KeychainHelper.read(key: key), "")
    }
}
