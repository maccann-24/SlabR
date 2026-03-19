import XCTest
import UIKit
@testable import Slabr

final class VisionServiceTests: XCTestCase {

    // MARK: - Downscaling

    func testDownscaleReducesLargeImage() {
        let image = makeImage(width: 3000, height: 3000)
        guard let result = VisionService.downscaled(image, maxDimension: 1500) else {
            XCTFail("Expected non-nil result")
            return
        }
        XCTAssertLessThanOrEqual(result.width, 1500)
        XCTAssertLessThanOrEqual(result.height, 1500)
    }

    func testDownscalePreservesSmallImage() {
        let image = makeImage(width: 500, height: 500)
        guard let result = VisionService.downscaled(image, maxDimension: 1500) else {
            XCTFail("Expected non-nil result")
            return
        }
        XCTAssertEqual(result.width, 500)
        XCTAssertEqual(result.height, 500)
    }

    func testDownscaleNilCGImageReturnsNil() {
        let image = UIImage()
        XCTAssertNil(VisionService.downscaled(image, maxDimension: 1500))
    }

    func testDownscaleNonSquareImage() {
        let image = makeImage(width: 4000, height: 2000)
        guard let result = VisionService.downscaled(image, maxDimension: 1500) else {
            XCTFail("Expected non-nil result")
            return
        }
        XCTAssertEqual(result.width, 1500)
        XCTAssertEqual(result.height, 750)
    }

    // MARK: - Helpers

    private func makeImage(width: Int, height: Int) -> UIImage {
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: width, height: height))
        return renderer.image { ctx in
            UIColor.white.setFill()
            ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))
        }
    }
}
