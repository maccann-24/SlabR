import UIKit

final class HapticManager {
    static let shared = HapticManager()
    private init() {}

    private let light = UIImpactFeedbackGenerator(style: .light)
    private let medium = UIImpactFeedbackGenerator(style: .medium)
    private let notification = UINotificationFeedbackGenerator()
    private let selection = UISelectionFeedbackGenerator()

    func imageSelected() {
        light.impactOccurred()
    }

    func certFound() {
        notification.notificationOccurred(.success)
    }

    func cameraCapture() {
        medium.impactOccurred()
    }

    func identificationDone() {
        notification.notificationOccurred(.success)
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

    func batchTick() {
        light.impactOccurred()
    }

    func warning() {
        notification.notificationOccurred(.warning)
    }

    func swipeAction() {
        light.impactOccurred()
    }

    func chartScrub() {
        selection.selectionChanged()
    }
}
