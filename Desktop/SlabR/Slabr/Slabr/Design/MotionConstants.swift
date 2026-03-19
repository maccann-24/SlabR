import SwiftUI

/// Centralized animation parameters. All motion in the app references these constants
/// to ensure consistency and respect `accessibilityReduceMotion`.
enum Motion {
    // MARK: - Animations

    static func buttonPress(reduceMotion: Bool) -> Animation {
        reduceMotion ? .linear(duration: 0) : .spring(response: 0.25, dampingFraction: 0.8)
    }

    static func contentReveal(reduceMotion: Bool, delay: Double = 0) -> Animation {
        reduceMotion ? .linear(duration: 0) : .spring(response: 0.5, dampingFraction: 0.8).delay(delay)
    }

    static func tabSwitch(reduceMotion: Bool) -> Animation {
        reduceMotion ? .linear(duration: 0) : .spring(response: 0.3, dampingFraction: 0.75)
    }

    // MARK: - Scale Values

    static let primaryButtonPress: CGFloat = 0.97
    static let fabPress: CGFloat = 0.93
    static let tilePress: CGFloat = 0.97
}
