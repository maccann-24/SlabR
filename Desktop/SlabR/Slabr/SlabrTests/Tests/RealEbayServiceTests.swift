import XCTest
@testable import Slabr

final class RealEbayServiceTests: XCTestCase {

    private let sut = RealEbayService.shared

    func testMapConditionPSAGradedReturnsLikeNew() {
        let result = sut.mapConditionToEbay(nil, grade: "10")

        XCTAssertEqual(result.condition, "LIKE_NEW")
        XCTAssertEqual(result.description, "PSA 10")
    }

    func testMapConditionRawNearMintReturnsVeryGood() {
        let result = sut.mapConditionToEbay(CardCondition.nearMint.rawValue, grade: nil)

        XCTAssertEqual(result.condition, "VERY_GOOD")
    }

    func testMapConditionRawPoorReturnsAcceptable() {
        let result = sut.mapConditionToEbay(CardCondition.poor.rawValue, grade: nil)

        XCTAssertEqual(result.condition, "ACCEPTABLE")
    }

    func testMapConditionNilReturnsLikeNew() {
        let result = sut.mapConditionToEbay(nil, grade: nil)

        XCTAssertEqual(result.condition, "LIKE_NEW")
        XCTAssertNil(result.description)
    }
}
