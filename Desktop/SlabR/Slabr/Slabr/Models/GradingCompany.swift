import Foundation

/// Grading companies supported by the app.
/// BGS is planned but not built — architecture only.
enum GradingCompany: String, CaseIterable {
    case psa
    case bgs  // Planned — same camera pattern, different API
}
