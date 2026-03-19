import CoreGraphics
@testable import Slabr

final class MockCardDetectionService: CardDetectionServiceProtocol {
    var resultToReturn: CardScanType = .unknown

    func detectCardType(from cgImage: CGImage) -> CardScanType {
        resultToReturn
    }
}
