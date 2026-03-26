import XCTest
@testable import Slabr

final class URLEncodingTests: XCTestCase {

    func testUrlEncodeAmpersand() throws {
        XCTAssertEqual(try PSAService.shared.urlEncode("a&b"), "a%26b")
    }

    func testUrlEncodeSpaceAndPlus() throws {
        let encoded = try PSAService.shared.urlEncode("a b+c")
        XCTAssertEqual(encoded, "a%20b%2Bc")
    }

    func testUrlEncodeAlphanumericsUntouched() throws {
        XCTAssertEqual(try PSAService.shared.urlEncode("abc123"), "abc123")
    }
}
