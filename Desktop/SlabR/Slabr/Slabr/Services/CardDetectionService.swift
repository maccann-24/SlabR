import CoreImage
import UIKit

/// Protocol for card type detection, enabling mock injection for tests.
protocol CardDetectionServiceProtocol {
    func detectCardType(from cgImage: CGImage) -> CardScanType
}

/// Color-based heuristic to classify camera frames as PSA slab vs raw card.
/// Detects PSA slabs by looking for dominant gold/yellow regions in the center of the frame.
/// Falls back to `.unknown` if the hue analysis is ambiguous.
final class CardDetectionService: CardDetectionServiceProtocol {
    private let ciContext = CIContext()

    private enum Thresholds {
        static let cropInsetX: CGFloat = 0.3
        static let cropSize: CGFloat = 0.4
        static let psaHueMin: CGFloat = 30
        static let psaHueMax: CGFloat = 65
        static let psaSaturationMin: CGFloat = 0.25
        static let psaBrightnessMin: CGFloat = 0.4
        static let neutralSaturationMax: CGFloat = 0.15
    }

    func detectCardType(from cgImage: CGImage) -> CardScanType {
        let ciImage = CIImage(cgImage: cgImage)

        // Sample the center 40% of the frame
        let width = ciImage.extent.width
        let height = ciImage.extent.height
        let cropRect = CGRect(
            x: width * Thresholds.cropInsetX,
            y: height * Thresholds.cropInsetX,
            width: width * Thresholds.cropSize,
            height: height * Thresholds.cropSize
        )
        let cropped = ciImage.cropped(to: cropRect)

        // Get average color of the cropped region
        guard let avgFilter = CIFilter(name: "CIAreaAverage", parameters: [
            kCIInputImageKey: cropped,
            kCIInputExtentKey: CIVector(cgRect: cropped.extent)
        ]),
        let outputImage = avgFilter.outputImage else {
            return .unknown
        }

        // Read the pixel
        var pixel = [UInt8](repeating: 0, count: 4)
        ciContext.render(
            outputImage,
            toBitmap: &pixel,
            rowBytes: 4,
            bounds: CGRect(x: 0, y: 0, width: 1, height: 1),
            format: .RGBA8,
            colorSpace: CGColorSpaceCreateDeviceRGB()
        )

        let r = CGFloat(pixel[0]) / 255.0
        let g = CGFloat(pixel[1]) / 255.0
        let b = CGFloat(pixel[2]) / 255.0

        // Convert to HSB
        let color = UIColor(red: r, green: g, blue: b, alpha: 1.0)
        var hue: CGFloat = 0
        var saturation: CGFloat = 0
        var brightness: CGFloat = 0
        color.getHue(&hue, saturation: &saturation, brightness: &brightness, alpha: nil)

        let hueDegrees = hue * 360

        // PSA gold range: hue ~30-65°, saturation > 0.25, brightness > 0.4
        if hueDegrees >= Thresholds.psaHueMin && hueDegrees <= Thresholds.psaHueMax
            && saturation > Thresholds.psaSaturationMin && brightness > Thresholds.psaBrightnessMin {
            return .psaSlab
        }

        // Clear/neutral (low saturation) suggests raw card in sleeve/toploader
        if saturation < Thresholds.neutralSaturationMax {
            return .rawCard
        }

        return .unknown
    }
}
