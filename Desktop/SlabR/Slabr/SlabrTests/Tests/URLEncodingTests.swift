import XCTest
@testable import Slabr

final class URLEncodingTests: XCTestCase {

    func testUrlEncodeAmpersand() {
        XCTAssertEqual(PSAService.shared.urlEncode("a&b"), "a%26b")
    }

    func testUrlEncodeSpaceAndPlus() {
        let encoded = PSAService.shared.urlEncode("a b+c")
        XCTAssertEqual(encoded, "a%20b%2Bc")
    }

    func testUrlEncodeAlphanumericsUntouched() {
        XCTAssertEqual(PSAService.shared.urlEncode("abc123"), "abc123")
    }
}
