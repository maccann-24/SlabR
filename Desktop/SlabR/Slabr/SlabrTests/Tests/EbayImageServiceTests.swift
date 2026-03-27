import XCTest
@testable import Slabr

final class EbayImageServiceTests: XCTestCase {

    func testExtractFullURLFromValidXML() {
        let xml = "<FullURL>https://example.com/img.jpg</FullURL>"
        let result = EbayImageService.extractFullURL(from: xml)

        XCTAssertEqual(result, "https://example.com/img.jpg")
    }

    func testExtractFullURLFromInvalidXML() {
        let xml = "<SomeOtherTag>https://example.com/img.jpg</SomeOtherTag>"
        let result = EbayImageService.extractFullURL(from: xml)

        XCTAssertNil(result, "Should return nil when <FullURL> tag is absent")
    }

    func testExtractFullURLIgnoresSurroundingTags() {
        let xml = """
        <?xml version="1.0" encoding="UTF-8"?>
        <UploadSiteHostedPicturesResponse xmlns="urn:ebay:apis:eBLBaseComponents">
            <Ack>Success</Ack>
            <SiteHostedPictureDetails>
                <PictureName>slabr-listing</PictureName>
                <FullURL>https://i.ebayimg.com/images/g/abc123/s-l1600.jpg</FullURL>
                <BaseURL>https://i.ebayimg.com/images/g/abc123/</BaseURL>
            </SiteHostedPictureDetails>
        </UploadSiteHostedPicturesResponse>
        """
        let result = EbayImageService.extractFullURL(from: xml)

        XCTAssertEqual(result, "https://i.ebayimg.com/images/g/abc123/s-l1600.jpg")
    }
}
