import SwiftUI

struct StepIndicator: View {
    let current: Int
    let total: Int

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        HStack(spacing: Spacing.sm) {
            ForEach(1..<total + 1, id: \.self) { step in
                Capsule()
                    .fill(step <= current ? Color.brandAccent : Color.separator)
                    .frame(width: step == current ? 24 : 8, height: 8)
                    .animation(Motion.buttonPress(reduceMotion: reduceMotion), value: current)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Step \(current) of \(total)")
    }
}
