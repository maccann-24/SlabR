import os
import Vision
import UIKit

/// On-device OCR service for extracting PSA cert numbers from slab images.
enum VisionService {
    /// Extracts an 8-digit PSA cert number from a card slab image.
    /// The image is first downscaled to max 1500px, then processed via `performOCR`.
    static func extractCertNumber(from image: UIImage) async throws -> String? {
        guard let cgImage = downscaled(image) else { return nil }
        return try await extractCertNumber(from: cgImage)
    }

    /// Extracts an 8-digit PSA cert number from a CGImage (for camera frame processing).
    /// Skips downscaling since camera frames are already at a reasonable resolution (1280x720).
    /// Uses `.fast` recognition level — sufficient for clear PSA slab labels at camera fps.
    static func extractCertNumber(from cgImage: CGImage) async throws -> String? {
        let strings = try await performOCR(on: cgImage, recognitionLevel: .fast)
        let combined = strings.joined(separator: " ")
        guard let match = combined.range(of: certPattern, options: .regularExpression) else {
            return nil
        }
        return String(combined[match])
    }

    // MARK: - Private

    private static let certPattern = #"\b\d{8}\b"#

    /// Runs VNRecognizeTextRequest on a CGImage and returns recognized text strings.
    /// A `hasResumed` guard prevents double-continuation crashes when both the
    /// VNRecognizeTextRequest callback and the `perform()` catch block fire.
    /// - Parameter recognitionLevel: `.fast` for camera frames, `.accurate` for imported images.
    private static func performOCR(
        on cgImage: CGImage,
        recognitionLevel: VNRequestTextRecognitionLevel = .accurate
    ) async throws -> [String] {
        try await withCheckedThrowingContinuation { continuation in
            let hasResumed = OSAllocatedUnfairLock(initialState: false)
            let resume: (Result<[String], Error>) -> Void = { result in
                let alreadyResumed = hasResumed.withLock { current in
                    let was = current
                    current = true
                    return was
                }
                guard !alreadyResumed else { return }
                continuation.resume(with: result)
            }

            let request = VNRecognizeTextRequest { request, error in
                if let error {
                    resume(.failure(error))
                    return
                }
                let candidates = (request.results as? [VNRecognizedTextObservation]) ?? []
                let strings = candidates.compactMap { $0.topCandidates(1).first?.string }
                resume(.success(strings))
            }
            request.recognitionLevel = recognitionLevel
            request.usesLanguageCorrection = false
            request.minimumTextHeight = 0.02

            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            do {
                try handler.perform([request])
            } catch {
                resume(.failure(error))
            }
        }
    }

    /// Downscales a UIImage so its longest edge is at most `maxDimension` pixels.
    /// Returns the original CGImage if already within bounds, or `nil` if the image has no CGImage backing.
    static func downscaled(_ image: UIImage, maxDimension: CGFloat = 1500) -> CGImage? {
        guard let cgImage = image.cgImage else { return nil }
        let width = CGFloat(cgImage.width)
        let height = CGFloat(cgImage.height)
        guard max(width, height) > maxDimension else { return cgImage }

        let scale = maxDimension / max(width, height)
        let newWidth = Int(width * scale)
        let newHeight = Int(height * scale)

        guard let context = CGContext(
            data: nil,
            width: newWidth,
            height: newHeight,
            bitsPerComponent: cgImage.bitsPerComponent,
            bytesPerRow: 0,
            space: cgImage.colorSpace ?? CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: cgImage.bitmapInfo.rawValue
        ) else { return cgImage }

        context.interpolationQuality = .high
        context.draw(cgImage, in: CGRect(x: 0, y: 0, width: newWidth, height: newHeight))
        return context.makeImage()
    }
}
