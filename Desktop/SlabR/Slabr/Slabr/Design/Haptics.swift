import UIKit

final class HapticManager {
    static let shared = HapticManager()
    private init() {}

    private let light = UIImpactFeedbackGenerator(style: .light)
    private let medium = UIImpactFeedbackGenerator(style: .medium)
    private let notification = UINotificationFeedbackGenerator()


    func imageSelected() {
        light.impactOccurred()
    }

    func certFound() {
        notification.notificationOccurred(.success)
    }

    func cameraCapture() {
        medium.impactOccurred()
    }

    func listingPublished() {
        notification.notificationOccurred(.success)
    }

    func postSuccess() {
        notification.notificationOccurred(.success)
    }

    func postFailed() {
        notification.notificationOccurred(.error)
    }

    func buttonTapped() {
        medium.impactOccurred()
    }

    func warning() {
        notification.notificationOccurred(.warning)
    }

    func success() {
        notification.notificationOccurred(.success)
    }

    func error() {
        notification.notificationOccurred(.error)
    }
}
