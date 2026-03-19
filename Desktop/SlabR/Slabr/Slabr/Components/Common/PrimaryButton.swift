import SwiftUI

struct PrimaryButton: View {
    let title: String
    let isEnabled: Bool
    let action: () -> Void

    init(_ title: String, isEnabled: Bool = true, action: @escaping () -> Void) {
        self.title = title
        self.isEnabled = isEnabled
        self.action = action
    }

    var body: some View {
        Button {
            HapticManager.shared.buttonTapped()
            action()
        } label: {
            Text(title)
                .font(.body.weight(.semibold))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 56)
                .background(isEnabled ? Color.brandAccent : Color.neutral)
                .clipShape(RoundedRectangle(cornerRadius: 16))
        }
        .disabled(!isEnabled)
    }
}
