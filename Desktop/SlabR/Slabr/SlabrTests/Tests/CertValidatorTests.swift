import XCTest
@testable import Slabr

final class CertValidatorTests: XCTestCase {

    // MARK: - validate(_:)

    func testValidateAccepts8Digits() {
        XCTAssertNil(CertValidator.validate("12345678"))
    }

    func testValidateRejects7Digits() {
        XCTAssertNotNil(CertValidator.validate("1234567"))
    }

    func testValidateRejects9Digits() {
        XCTAssertNotNil(CertValidator.validate("123456789"))
    }

    func testValidateRejectsLetters() {
        XCTAssertNotNil(CertValidator.validate("1234567a"))
    }

    func testValidateRejectsEmpty() {
        XCTAssertNotNil(CertValidator.validate(""))
    }

    func testValidateTrimsWhitespace() {
        XCTAssertNil(CertValidator.validate(" 12345678 "))
    }

    // MARK: - cleaned(_:)

    func testCleanedReturns8Digits() {
        XCTAssertEqual(CertValidator.cleaned("12345678"), "12345678")
    }

    func testCleanedReturnsNilForInvalid() {
        XCTAssertNil(CertValidator.cleaned("abc"))
    }
}
