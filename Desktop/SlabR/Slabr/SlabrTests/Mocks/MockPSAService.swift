import Foundation
@testable import Slabr

final class MockPSAService: PSAServiceProtocol {
    var authenticateResult: Result<Void, Error> = .success(())
    var lookupResult: Result<PSACard, Error> = .success(MockData.psaCard)
    var authenticateCallCount = 0
    var lookupCallCount = 0
    var lastLookupCert: String?

    func authenticate(username: String, password: String) async throws {
        authenticateCallCount += 1
        try authenticateResult.get()
    }

    func lookupCert(_ certNumber: String) async throws -> PSACard {
        lookupCallCount += 1
        lastLookupCert = certNumber
        return try lookupResult.get()
    }
}
