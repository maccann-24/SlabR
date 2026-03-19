import Foundation

/// Shared cert number validation used by both PSAImportViewModel and CameraViewModel.
enum CertValidator {
    /// Validates an 8-digit cert number string. Returns an error message or nil if valid.
    static func validate(_ input: String) -> String? {
        let trimmed = input.trimmingCharacters(in: .whitespaces)
        guard trimmed.count == 8, trimmed.allSatisfy(\.isNumber) else {
            return "Enter a valid 8-digit cert number."
        }
        return nil
    }

    /// Trims and returns the cert number if valid, or nil if invalid.
    static func cleaned(_ input: String) -> String? {
        let trimmed = input.trimmingCharacters(in: .whitespaces)
        guard trimmed.count == 8, trimmed.allSatisfy(\.isNumber) else { return nil }
        return trimmed
    }
}
