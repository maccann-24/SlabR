import SwiftUI

struct AddFAB: View {
    let onTap: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var isPressed = false

    var body: some View {
        Button {
            HapticManager.shared.buttonTapped()
            onTap()
        } label: {
            Image(systemName: "plus")
                .font(.system(size: 22, weight: .semibold))
                .foregroundColor(.white)
                .frame(width: 52, height: 52)
                .background(Color.brandAccent)
                .clipShape(Circle())
                .shadow(color: Color.brandAccent.opacity(0.4), radius: 8, x: 0, y: 4)
        }
        .scaleEffect(isPressed ? Motion.fabPress : 1.0)
        .animation(Motion.buttonPress(reduceMotion: reduceMotion), value: isPressed)
        .onLongPressGesture(minimumDuration: .infinity, pressing: { pressing in
            isPressed = pressing
        }, perform: {})
        .accessibilityLabel("Add new listing")
    }
}
