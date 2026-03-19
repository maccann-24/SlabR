import Foundation

/// Classification result from real-time camera detection.
/// Determines which flow the camera routes to after analyzing the viewfinder.
enum CardScanType: Equatable {
    case psaSlab    // PSA holder detected — route to cert OCR flow
    case rawCard    // Ungraded card in sleeve/toploader — route to raw flow
    case unknown    // Cannot determine — show fallback prompt
}
