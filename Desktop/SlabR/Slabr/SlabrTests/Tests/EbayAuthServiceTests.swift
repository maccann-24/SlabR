import XCTest
@testable import Slabr

@MainActor
final class EbayAuthServiceTests: XCTestCase {

    private let sut = EbayAuthService.shared

    // MARK: - buildAuthorizationURL

    func testBuildAuthorizationURLContainsPKCE() {
        let url = EbayAuthService.buildAuthorizationURL(
            clientId: "test-client",
            ruName: "test-runame",
            scopes: "https://api.ebay.com/oauth/api_scope",
            codeChallenge: "abc123challenge",
            state: "state-xyz",
            authBaseURL: "https://auth.ebay.com"
        )

        XCTAssertTrue(url.contains("code_challenge=abc123challenge"), "URL must contain code_challenge parameter")
        XCTAssertTrue(url.contains("code_challenge_method=S256"), "URL must contain S256 challenge method")
    }

    func testBuildAuthorizationURLContainsState() {
        let url = EbayAuthService.buildAuthorizationURL(
            clientId: "test-client",
            ruName: "test-runame",
            scopes: "https://api.ebay.com/oauth/api_scope",
            codeChallenge: "abc123challenge",
            state: "my-state-param",
            authBaseURL: "https://auth.ebay.com"
        )

        XCTAssertTrue(url.contains("state=my-state-param"), "URL must contain the state parameter")
    }

    // MARK: - PKCE Helpers

    func testCodeVerifierLength() {
        let verifier = sut.generateCodeVerifier()
        XCTAssertGreaterThanOrEqual(verifier.count, 43, "Code verifier must be at least 43 characters")
    }

    func testCodeChallengeIsDeterministic() {
        let verifier = "fixed-test-verifier-string-for-determinism"
        let challenge1 = sut.generateCodeChallenge(from: verifier)
        let challenge2 = sut.generateCodeChallenge(from: verifier)

        XCTAssertEqual(challenge1, challenge2, "Same verifier must always produce the same challenge")
    }

    func testCodeChallengeIsDifferentFromVerifier() {
        let verifier = sut.generateCodeVerifier()
        let challenge = sut.generateCodeChallenge(from: verifier)

        XCTAssertNotEqual(verifier, challenge, "Challenge must not equal the verifier")
    }
}
