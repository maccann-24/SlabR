import Foundation
import os

/// Uploads images to eBay Picture Services via the Trading API `UploadSiteHostedPictures` call.
///
/// Returns an eBay-hosted image URL (e.g., `https://i.ebayimg.com/...`) suitable for use
/// in Inventory API `imageUrls` fields. Uses OAuth token from `EbayAuthService` for auth.
///
/// D-006: Trading API `UploadSiteHostedPictures` is the only Trading API call allowed;
/// all other listing operations use the Inventory API (REST).
enum EbayImageService {

    // MARK: - Errors

    enum ImageError: LocalizedError {
        case uploadFailed(String)
        case noImageURL
        case invalidResponse
        case networkError(Error)

        var errorDescription: String? {
            switch self {
            case .uploadFailed(let reason):
                return "Image upload failed: \(reason)"
            case .noImageURL:
                return "eBay did not return an image URL."
            case .invalidResponse:
                return "Invalid response from eBay image service."
            case .networkError(let error):
                return "Network error during image upload: \(error.localizedDescription)"
            }
        }
    }

    // MARK: - Public

    /// Uploads JPEG image data to eBay Picture Services.
    /// - Parameter imageData: JPEG-encoded image data.
    /// - Returns: The eBay-hosted image URL (`https://i.ebayimg.com/...`).
    /// - Throws: `ImageError` on failure.
    static func uploadImage(_ imageData: Data) async throws -> String {
        let token = try await EbayAuthService.shared.getAccessToken()
        let baseURL = AppEnvironment.ebayEnvironment.apiBaseURL

        guard let url = URL(string: "\(baseURL)/ws/api.dll") else {
            throw ImageError.uploadFailed("Invalid Trading API URL")
        }

        let boundary = UUID().uuidString
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 60
        request.setValue(
            "multipart/form-data; boundary=\(boundary)",
            forHTTPHeaderField: "Content-Type"
        )
        request.setValue("UploadSiteHostedPictures", forHTTPHeaderField: "X-EBAY-API-CALL-NAME")
        request.setValue("0", forHTTPHeaderField: "X-EBAY-API-SITEID")
        request.setValue("967", forHTTPHeaderField: "X-EBAY-API-COMPATIBILITY-LEVEL")
        request.setValue(token, forHTTPHeaderField: "X-EBAY-API-IAF-TOKEN")

        request.httpBody = buildMultipartBody(boundary: boundary, imageData: imageData)

        Log.ebay.info("Uploading image to eBay Picture Services (\(imageData.count) bytes)")

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            Log.ebay.error("Image upload network error: \(error.localizedDescription, privacy: .public)")
            throw ImageError.networkError(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw ImageError.invalidResponse
        }

        let responseString = String(data: data, encoding: .utf8) ?? ""

        guard (200...299).contains(httpResponse.statusCode) else {
            Log.ebay.error("Image upload HTTP \(httpResponse.statusCode): \(responseString, privacy: .public)")
            throw ImageError.uploadFailed("HTTP \(httpResponse.statusCode)")
        }

        guard let fullURL = extractFullURL(from: responseString) else {
            Log.ebay.error("No FullURL in response: \(responseString, privacy: .public)")
            throw ImageError.noImageURL
        }

        Log.ebay.info("Image uploaded successfully")
        return fullURL
    }

    // MARK: - Private

    /// Builds the multipart/form-data body containing the XML request and JPEG image.
    private static func buildMultipartBody(boundary: String, imageData: Data) -> Data {
        var body = Data()

        // XML payload part
        let xml = """
        <?xml version="1.0" encoding="utf-8"?>
        <UploadSiteHostedPicturesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
            <PictureName>slabr-listing</PictureName>
        </UploadSiteHostedPicturesRequest>
        """

        body.appendString("--\(boundary)\r\n")
        body.appendString("Content-Disposition: form-data; name=\"XML Payload\"\r\n")
        body.appendString("Content-Type: text/xml\r\n\r\n")
        body.appendString(xml)
        body.appendString("\r\n")

        // Image binary part
        body.appendString("--\(boundary)\r\n")
        body.appendString("Content-Disposition: form-data; name=\"dummy\"; filename=\"image.jpg\"\r\n")
        body.appendString("Content-Type: image/jpeg\r\n\r\n")
        body.append(imageData)
        body.appendString("\r\n--\(boundary)--\r\n")

        return body
    }

    /// Extracts the `<FullURL>` value from the eBay XML response.
    internal static func extractFullURL(from xml: String) -> String? {
        guard let startRange = xml.range(of: "<FullURL>"),
              let endRange = xml.range(of: "</FullURL>") else {
            return nil
        }
        let url = String(xml[startRange.upperBound..<endRange.lowerBound])
        return url.isEmpty ? nil : url
    }
}

// MARK: - Data + String Append

private extension Data {
    /// Appends a UTF-8 encoded string to the data buffer.
    mutating func appendString(_ string: String) {
        if let data = string.data(using: .utf8) {
            append(data)
        }
    }
}
