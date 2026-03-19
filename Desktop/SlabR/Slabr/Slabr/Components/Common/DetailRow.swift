import SwiftUI

struct DetailRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(.cardMeta)
                .foregroundColor(.labelSecondary)
            Spacer()
            Text(value)
                .font(.cardMeta)
                .foregroundColor(.labelPrimary)
        }
    }
}
