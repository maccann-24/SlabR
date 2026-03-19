import Foundation

protocol PSAServiceProtocol {
    func authenticate(username: String, password: String) async throws
    func lookupCert(_ certNumber: String) async throws -> PSACard
}

extension PSAService: PSAServiceProtocol {}
